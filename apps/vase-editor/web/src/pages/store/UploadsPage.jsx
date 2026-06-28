import React, { useEffect, useMemo, useRef, useState } from 'react';
import StoreLayout from '../../components/layout/StoreLayout';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../utils/navigation';
import {
  createPublicUploadUrl,
  fetchPrivateFileBlob,
  getUploadsSession,
  listUploadFiles,
  uploadPrivateFile,
} from '../../utils/uploadsClient';

const UploadCloud = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 13v8" /><path d="m8 17 4-4 4 4" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /><path d="M16 16h1a5 5 0 0 0 3.39-1.61" /></svg>;
const ImageIcon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>;
const FileText = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>;
const LinkIcon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;

const formatBytes = (bytes = 0) => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const isImage = (file) => String(file?.mime_type || '').startsWith('image/');

export default function UploadsPage() {
  const { user, loading } = useAuth();
  const inputRef = useRef(null);
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState({});
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [publicLink, setPublicLink] = useState('');

  const imageCount = useMemo(() => files.filter(isImage).length, [files]);
  const totalSize = useMemo(() => files.reduce((sum, item) => sum + Number(item.size || 0), 0), [files]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user]);

  const loadFiles = async () => {
    setError('');
    const nextSession = session || await getUploadsSession();
    setSession(nextSession);
    const nextFiles = await listUploadFiles(nextSession);
    setFiles(nextFiles);
    return { nextSession, nextFiles };
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadFiles().catch((err) => {
      if (active) setError(err.message || 'No se pudieron cargar tus archivos.');
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!session || !files.length) return undefined;
    let cancelled = false;
    const objectUrls = [];

    const loadPreviews = async () => {
      const next = {};
      for (const file of files.filter(isImage).slice(0, 12)) {
        try {
          const blob = await fetchPrivateFileBlob(session, file.private_url);
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          next[file.filename] = url;
        } catch {
          // Preview is optional; the file still remains downloadable.
        }
      }
      if (!cancelled) setPreviews(next);
    };

    loadPreviews();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files, session]);

  const handleUploadFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;

    setBusy(true);
    setError('');
    setPublicLink('');
    try {
      const nextSession = session || await getUploadsSession();
      setSession(nextSession);
      for (const file of selected) {
        await uploadPrivateFile(nextSession, file);
      }
      const nextFiles = await listUploadFiles(nextSession);
      setFiles(nextFiles);
    } catch (err) {
      setError(err.message || 'No se pudo subir el archivo.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handlePublicLink = async (file) => {
    setError('');
    setPublicLink('');
    try {
      const nextSession = session || await getUploadsSession();
      const payload = await createPublicUploadUrl(nextSession, file.filename);
      setPublicLink(payload.public_url || '');
      if (payload.public_url) {
        await navigator.clipboard?.writeText(payload.public_url).catch(() => null);
      }
    } catch (err) {
      setError(err.message || 'No se pudo crear el enlace publico.');
    }
  };

  const handleDownload = async (file) => {
    setError('');
    try {
      const nextSession = session || await getUploadsSession();
      const blob = await fetchPrivateFileBlob(nextSession, file.private_url);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'No se pudo descargar el archivo.');
    }
  };

  if (loading || (!user && !error)) {
    return (
      <StoreLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4 text-sm text-zinc-500">Cargando archivos...</div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Archivos privados</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-white md:text-4xl">Mis imagenes y documentos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Todo lo que subas queda guardado en tu carpeta privada de Vase. Solo tu cuenta puede abrir estos archivos, salvo que generes un enlace publico temporal.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
            <span className="font-bold text-zinc-950 dark:text-white">{session?.user?.username || user?.email || 'Cuenta Vase'}</span>
            <p className="text-xs text-zinc-500">Carpeta privada</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Archivos</p>
            <p className="mt-2 text-3xl font-black">{files.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Imagenes</p>
            <p className="mt-2 text-3xl font-black">{imageCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Uso</p>
            <p className="mt-2 text-3xl font-black">{formatBytes(totalSize)}</p>
          </div>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleUploadFiles(event.dataTransfer.files);
          }}
          className={[
            'mt-6 rounded-2xl border-2 border-dashed p-6 transition-colors',
            dragActive ? 'border-primary bg-primary/10' : 'border-zinc-300 bg-white dark:border-white/15 dark:bg-white/5',
          ].join(' ')}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <UploadCloud className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-950 dark:text-white">Subir archivos</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Acepta imagenes, videos y PDF. Tambien podes arrastrarlos aca.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
            >
              {busy ? 'Subiendo...' : 'Elegir archivos'}
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              onChange={(event) => handleUploadFiles(event.target.files)}
              className="hidden"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>
        ) : null}

        {publicLink ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
            Enlace publico copiado: <a className="font-bold underline" href={publicLink} target="_blank" rel="noreferrer">{publicLink}</a>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <article key={file.filename} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex aspect-video items-center justify-center bg-zinc-100 dark:bg-black/20">
                {isImage(file) && previews[file.filename] ? (
                  <img src={previews[file.filename]} alt={file.filename} className="h-full w-full object-cover" />
                ) : isImage(file) ? (
                  <ImageIcon className="h-10 w-10 text-zinc-400" />
                ) : (
                  <FileText className="h-10 w-10 text-zinc-400" />
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="truncate text-sm font-black text-zinc-950 dark:text-white">{file.filename}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{file.mime_type} · {formatBytes(file.size)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleDownload(file)} className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-black transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/10">Descargar</button>
                  <button type="button" onClick={() => handlePublicLink(file)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-black text-white transition hover:opacity-90">
                    <LinkIcon className="h-4 w-4" />
                    Link
                  </button>
                </div>
              </div>
            </article>
          ))}

          {!files.length && !busy ? (
            <div className="col-span-full rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-white/5">
              Todavia no subiste archivos en esta cuenta.
            </div>
          ) : null}
        </div>
      </section>
    </StoreLayout>
  );
}
