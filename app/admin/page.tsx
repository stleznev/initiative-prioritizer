"use client";

import { useState, ChangeEvent, FormEvent } from 'react';

/**
 * Simple administrative page that allows uploading Excel files to create new
 * datasets. This prototype omits authentication for brevity. Files are sent
 * via a multipart/form-data POST request to `/api/admin/upload`. The
 * endpoint validates the file and stores the data in the database.
 */
export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setError(null);
    const files = e.target.files;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Выберите файл для загрузки');
      return;
    }
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Файл успешно загружен. Версия датасета: ${data.version}`);
        setFile(null);
      } else {
        setError(data.error || 'Не удалось загрузить файл');
      }
    } catch (_err) {
      setError('Ошибка сети при отправке файла');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
      <h1 className="text-2xl font-bold">Админ панель</h1>
      <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4 w-full max-w-md">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring disabled:opacity-50"
        >
          {loading ? 'Загрузка…' : 'Загрузить'}
        </button>
      </form>
      {message && <p className="text-green-600">{message}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
