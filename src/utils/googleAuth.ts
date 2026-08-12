import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Sheets and Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Force consent prompt to display permission checkboxes
provider.setCustomParameters({
  prompt: 'consent'
});

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('edu_google_access_token');

export const validateGoogleToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
    if (res.status === 200) {
      const data = await res.json();
      const expiresIn = parseInt(data.expires_in, 10);
      return !isNaN(expiresIn) && expiresIn > 10;
    }
    if (res.status === 400 || res.status === 401) {
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error validating google token:', err);
    return true; // preserve on network error to allow offline cache usage
  }
};

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        const isValid = await validateGoogleToken(cachedAccessToken);
        if (isValid) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else {
          cachedAccessToken = null;
          localStorage.removeItem('edu_google_access_token');
          if (onAuthFailure) onAuthFailure();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('google-auth-expired'));
          }
        }
      } else {
        // Fallback check if token is in local storage
        const storedToken = localStorage.getItem('edu_google_access_token');
        if (storedToken) {
          const isValid = await validateGoogleToken(storedToken);
          if (isValid) {
            cachedAccessToken = storedToken;
            if (onAuthSuccess) onAuthSuccess(user, storedToken);
          } else {
            localStorage.removeItem('edu_google_access_token');
            if (onAuthFailure) onAuthFailure();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('google-auth-expired'));
            }
          }
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('edu_google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('edu_google_access_token', credential.accessToken);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('google-auth-updated'));
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('edu_google_access_token');
  }
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    localStorage.setItem('edu_google_access_token', token);
  } else {
    localStorage.removeItem('edu_google_access_token');
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('google-auth-updated'));
  }
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('edu_google_access_token');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('google-auth-updated'));
  }
};

export const uploadImageToDrive = async (base64Data: string, filename: string, token: string): Promise<string> => {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return base64Data; // Already a link or not a base64 image
  }

  try {
    const match = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) return base64Data;
    const contentType = match[1];
    const base64Content = match[2];

    // Convert base64 to binary
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });

    // 1. Create file with metadata
    const metadata = {
      name: filename,
      mimeType: contentType,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    if (res.ok) {
      const data = await res.json();
      const fileId = data.id;

      // 2. Set permission to public/reader so anyone can view it
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        });
      } catch (permissionError) {
        console.warn('Could not set public view permission:', permissionError);
      }

      return data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    } else {
      console.error('Drive upload failed:', await res.text());
      return base64Data;
    }
  } catch (err) {
    console.error('Error uploading to Drive:', err);
    return base64Data;
  }
};

export const syncToGoogleSheets = async (
  type: 'jurnal' | 'siswa' | 'perkembangan' | 'perilaku' | 'home_visit' | 'users' | 'settings' | 'dokumentasi' | 'administrasi' | 'jadwal',
  list: any[]
): Promise<boolean> => {
  const token = cachedAccessToken;
  if (!token) return false;

  const sId = localStorage.getItem('edu_google_spreadsheet_id') || '14NHsOMokx_ngS-SlrRAXQkGGiBSQbXnO2AD9Tzj9gow';
  if (!sId) return false;

  let title = '';
  let headers: string[][] = [];
  let values: any[][] = [];

  if (type === 'jurnal') {
    title = 'Jurnal_Guru';
    headers = [
      ['id_jurnal', 'tanggal', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_ke', 'materi', 'uraian_pembelajaran', 'siswa_sakit', 'siswa_izin', 'siswa_alpa', 'catatan', 'foto_1', 'foto_2']
    ];

    // Process list to upload any base64 photos to Drive
    const processedList = await Promise.all(
      list.map(async (j) => {
        let foto_1 = j.foto_1 || '';
        let foto_2 = j.foto_2 || '';

        const dateStr = j.tanggal ? j.tanggal.substring(0, 10) : new Date().toISOString().substring(0, 10);
        const formattedDate = dateStr.split('-').reverse().join('-'); // converts YYYY-MM-DD to DD-MM-YYYY

        const safeGuru = (j.nama_guru || 'Guru').trim().replace(/[/\\?%*:|"<>]/g, '-');
        const safeMapel = (j.mata_pelajaran || 'Mapel').trim().replace(/[/\\?%*:|"<>]/g, '-');

        if (foto_1 && foto_1.startsWith('data:image/')) {
          const filename1 = `${safeGuru}_${safeMapel}_${formattedDate}_Foto1`;
          foto_1 = await uploadImageToDrive(foto_1, filename1, token);
          j.foto_1 = foto_1;
        }

        if (foto_2 && foto_2.startsWith('data:image/')) {
          const filename2 = `${safeGuru}_${safeMapel}_${formattedDate}_Foto2`;
          foto_2 = await uploadImageToDrive(foto_2, filename2, token);
          j.foto_2 = foto_2;
        }

        return { ...j, foto_1, foto_2 };
      })
    );

    // Save the processed list back to local cache so we don't upload again next time
    let hasChanges = false;
    list.forEach((orig, idx) => {
      const proc = processedList[idx];
      if (orig.foto_1 !== proc.foto_1) {
        orig.foto_1 = proc.foto_1;
        hasChanges = true;
      }
      if (orig.foto_2 !== proc.foto_2) {
        orig.foto_2 = proc.foto_2;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      try {
        localStorage.setItem('edu_jurnal', JSON.stringify(list));
      } catch (e) {
        console.error('Failed to update local journal cache with Drive URLs:', e);
      }
    }

    values = processedList.map(j => [
      j.id_jurnal || '',
      j.tanggal || '',
      j.nama_guru || '',
      j.mata_pelajaran || '',
      j.kelas || '',
      j.jam_ke || '',
      j.materi || '',
      j.uraian_pembelajaran || '',
      j.siswa_sakit || '',
      j.siswa_izin || '',
      j.siswa_alpa || '',
      j.catatan || '',
      j.foto_1 || '',
      j.foto_2 || ''
    ]);
  } else if (type === 'siswa') {
    title = 'Siswa';
    headers = [['id_siswa', 'nama_siswa', 'kelas', 'jenis_kelamin', 'nama_wali']];
    values = list.map(s => [
      s.id_siswa || '',
      s.nama_siswa || '',
      s.kelas || '',
      s.jenis_kelamin || '-',
      s.nama_wali || '-'
    ]);
  } else if (type === 'perkembangan') {
    title = 'Catatan_Perkembangan';
    headers = [
      ['id_catatan', 'tanggal', 'id_siswa', 'nama_guru', 'mata_pelajaran', 'kategori', 'deskripsi_perkembangan']
    ];
    values = list.map(p => [
      p.id_catatan || '',
      p.tanggal || '',
      p.id_siswa || '',
      p.nama_guru || '',
      p.mata_pelajaran || '',
      p.kategori || '',
      p.deskripsi_perkembangan || ''
    ]);
  } else if (type === 'perilaku') {
    title = 'Catatan_Perilaku';
    headers = [
      ['id_catatan', 'tanggal', 'id_siswa', 'nama_guru', 'mata_pelajaran', 'jenis_perilaku', 'deskripsi_perilaku', 'tindak_lanjut']
    ];
    values = list.map(p => [
      p.id_catatan || '',
      p.tanggal || '',
      p.id_siswa || '',
      p.nama_guru || '',
      p.mata_pelajaran || '',
      p.jenis_perilaku || '',
      p.deskripsi_perilaku || '',
      p.tindak_lanjut || ''
    ]);
  } else if (type === 'home_visit') {
    title = 'Home_Visit';
    headers = [
      ['id_kunjungan', 'tanggal', 'id_siswa', 'nama_guru', 'alasan_kunjungan', 'hasil_kunjungan', 'tindak_lanjut', 'foto_1', 'foto_2']
    ];

    const processedList = await Promise.all(
      list.map(async (h) => {
        let foto_1 = h.foto_1 || '';
        let foto_2 = h.foto_2 || '';

        const dateStr = h.tanggal ? h.tanggal.substring(0, 10) : new Date().toISOString().substring(0, 10);
        const formattedDate = dateStr.split('-').reverse().join('-');

        const safeGuru = (h.nama_guru || 'Guru').trim().replace(/[/\\?%*:|"<>]/g, '-');

        if (foto_1 && foto_1.startsWith('data:image/')) {
          const filename1 = `${safeGuru}_HomeVisit_${formattedDate}_Foto1`;
          foto_1 = await uploadImageToDrive(foto_1, filename1, token);
          h.foto_1 = foto_1;
        }

        if (foto_2 && foto_2.startsWith('data:image/')) {
          const filename2 = `${safeGuru}_HomeVisit_${formattedDate}_Foto2`;
          foto_2 = await uploadImageToDrive(foto_2, filename2, token);
          h.foto_2 = foto_2;
        }

        return { ...h, foto_1, foto_2 };
      })
    );

    let hasChanges = false;
    list.forEach((orig, idx) => {
      const proc = processedList[idx];
      if (orig.foto_1 !== proc.foto_1) {
        orig.foto_1 = proc.foto_1;
        hasChanges = true;
      }
      if (orig.foto_2 !== proc.foto_2) {
        orig.foto_2 = proc.foto_2;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      try {
        localStorage.setItem('edu_home_visit', JSON.stringify(list));
      } catch (e) {
        console.error('Failed to update local home visit cache with Drive URLs:', e);
      }
    }

    values = processedList.map(h => [
      h.id_kunjungan || '',
      h.tanggal || '',
      h.id_siswa || '',
      h.nama_guru || '',
      h.alasan_kunjungan || '',
      h.hasil_kunjungan || '',
      h.tindak_lanjut || '',
      h.foto_1 || '',
      h.foto_2 || ''
    ]);
  } else if (type === 'users') {
    title = 'Users';
    headers = [
      ['id_user', 'username', 'password', 'role', 'nama_lengkap', 'id_referensi', 'status']
    ];
    values = list.map(u => [
      u.id_user || '',
      u.username || '',
      u.password || '',
      u.role || '',
      u.nama_lengkap || '',
      u.id_referensi || '',
      u.status || ''
    ]);
  } else if (type === 'settings') {
    title = 'Settings';
    headers = [['key', 'value']];
    // list here is actually expected to be formatted as [key, value] pairs or single object wrapped in array
    values = Array.isArray(list[0]) ? list : [
      ['tahun_ajaran', list[0]?.tahun_ajaran || ''],
      ['batas_waktu_administrasi', list[0]?.batas_waktu_administrasi || ''],
      ['semester', list[0]?.semester || 'Ganjil']
    ];
  } else if (type === 'dokumentasi') {
    title = 'Dokumentasi_Kelas';
    headers = [
      ['id_dokumentasi', 'tanggal', 'kelas', 'nama_kegiatan', 'foto', 'nama_guru']
    ];

    const processedList = await Promise.all(
      list.map(async (d) => {
        let foto = d.foto || '';

        const dateStr = d.tanggal ? d.tanggal.substring(0, 10) : new Date().toISOString().substring(0, 10);
        const formattedDate = dateStr.split('-').reverse().join('-');

        const safeGuru = (d.nama_guru || 'Guru').trim().replace(/[/\\?%*:|"<>]/g, '-');
        const safeKegiatan = (d.nama_kegiatan || 'Kegiatan').trim().replace(/[/\\?%*:|"<>]/g, '-');

        if (foto && foto.startsWith('data:image/')) {
          const filename = `${safeGuru}_${safeKegiatan}_${formattedDate}_Foto`;
          foto = await uploadImageToDrive(foto, filename, token);
          d.foto = foto;
        }

        return { ...d, foto };
      })
    );

    let hasChanges = false;
    list.forEach((orig, idx) => {
      const proc = processedList[idx];
      if (orig.foto !== proc.foto) {
        orig.foto = proc.foto;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      try {
        localStorage.setItem('edu_dokumentasi', JSON.stringify(list));
      } catch (e) {
        console.error('Failed to update local dokumentasi cache with Drive URLs:', e);
      }
    }

    values = processedList.map(d => [
      d.id_dokumentasi || '',
      d.tanggal || '',
      d.kelas || '',
      d.nama_kegiatan || '',
      d.foto || '',
      d.nama_guru || ''
    ]);
  } else if (type === 'administrasi') {
    title = 'Administrasi_Guru';
    headers = [
      ['id_file', 'tanggal', 'nama_guru', 'nama_file', 'jenis_file', 'url_file']
    ];
    values = list.map(a => [
      a.id_file || '',
      a.tanggal || '',
      a.nama_guru || '',
      a.nama_file || '',
      a.jenis_file || '',
      a.url_file || ''
    ]);
  } else if (type === 'jadwal') {
    title = 'Jadwal_Guru';
    headers = [
      ['id_jadwal', 'nama_guru', 'hari', 'jam_ke', 'mata_pelajaran', 'kelas', 'status_reminder']
    ];
    values = list.map(j => [
      j.id_jadwal || '',
      j.nama_guru || '',
      j.hari || '',
      j.jam_ke || '',
      j.mata_pelajaran || '',
      j.kelas || '',
      j.status_reminder || ''
    ]);
  }

  try {
    // 1. Silent ensure sheet exists
    try {
      const resExist = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sId}?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resExist.ok) {
        const dExist = await resExist.json();
        const existingTitles = dExist.sheets?.map((s: any) => s.properties.title) || [];
        if (!existingTitles.includes(title)) {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sId}:batchUpdate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
          });
        }
      } else if (resExist.status === 401 || resExist.status === 403) {
        localStorage.removeItem('edu_google_access_token');
        cachedAccessToken = null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('google-auth-expired'));
        }
        return false;
      }
    } catch (e) {
      console.warn('Google Sheets tab verification skipped:', e);
    }

    const payloadValues = [...headers, ...values];

    // 2. Clear previous
    const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sId}/values/${encodeURIComponent(title)}!A1:Z1000:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!clearRes.ok) {
      if (clearRes.status === 401) {
        localStorage.removeItem('edu_google_access_token');
        cachedAccessToken = null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('google-auth-expired'));
        }
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('google-sheet-sync-failed', { detail: { title } }));
        }
      }
      return false;
    }

    // 3. Write new
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sId}/values/${encodeURIComponent(title)}!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: payloadValues })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Google Sheets write failed for tab ${title}:`, errText);
      if (response.status === 401) {
        localStorage.removeItem('edu_google_access_token');
        cachedAccessToken = null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('google-auth-expired'));
        }
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('google-sheet-sync-failed', { detail: { title } }));
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('google-sheet-sync-success'));
      }
    }

    return response.ok;
  } catch (error) {
    console.error('Auto-sync to Google Sheets failed:', error);
    return false;
  }
};

