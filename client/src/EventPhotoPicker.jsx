import React, { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Star, Trash2, Upload } from 'lucide-react';

const MAX_PHOTOS = 6;
const MAX_BYTES = 320 * 1024;

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(blob);
  });
}

async function compressPhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image file.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1440 / bitmap.width, 1100 / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  while (blob && blob.size > MAX_BYTES && quality > 0.54) {
    quality -= 0.08;
    blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  }
  if (!blob) throw new Error(`Could not process ${file.name}.`);
  return readAsDataUrl(blob);
}

export default function EventPhotoPicker({ images = [], onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function addPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const available = Math.max(0, MAX_PHOTOS - images.length);
    const selected = files.slice(0, available);
    if (files.length > available) setMessage(available ? `You can add up to ${MAX_PHOTOS} photos. The first ${available} selected will be added.` : `You already have the maximum of ${MAX_PHOTOS} photos.`);
    else setMessage('');
    if (!selected.length) return;

    setBusy(true);
    try {
      const compressed = await Promise.all(selected.map(compressPhoto));
      onChange([...images, ...compressed]);
    } catch (error) {
      setMessage(error.message || 'Unable to add these images.');
    } finally {
      setBusy(false);
    }
  }

  function setCover(index) {
    if (index === 0) return;
    const next = [...images];
    const [cover] = next.splice(index, 1);
    onChange([cover, ...next]);
  }

  function removePhoto(index) {
    onChange(images.filter((_, photoIndex) => photoIndex !== index));
  }

  return (
    <div className="event-photo-picker">
      <div className="photo-picker-heading">
        <div><b>Event photos</b><small>The first photo is the cover. Add up to {MAX_PHOTOS}; the rest appear in the event gallery.</small></div>
        <span>{images.length}/{MAX_PHOTOS}</span>
      </div>
      <div className="event-photo-grid">
        {images.map((image, index) => (
          <div className={`event-photo-thumb${index === 0 ? ' is-cover' : ''}`} key={`${index}-${image.slice(0, 36)}`}>
            <img src={image} alt={`Event photo ${index + 1}`} />
            {index === 0 ? <span className="cover-photo-label"><Star size={12} fill="currentColor" /> Cover photo</span> : (
              <button type="button" className="make-cover-button" onClick={() => setCover(index)} aria-label={`Make photo ${index + 1} the cover`}>Make cover</button>
            )}
            <button type="button" className="remove-photo-button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`}><Trash2 size={13} /></button>
          </div>
        ))}
        {images.length < MAX_PHOTOS && (
          <button type="button" className="add-event-photo" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? <LoaderCircle className="photo-spinner" size={21} /> : images.length ? <ImagePlus size={21} /> : <Upload size={21} />}
            <b>{busy ? 'Preparing photos...' : 'Add photos'}</b>
            <small>JPG, PNG, WEBP</small>
          </button>
        )}
      </div>
      <input ref={inputRef} className="photo-file-input" type="file" accept="image/*" multiple onChange={addPhotos} aria-label="Choose event photos" />
      {message && <small className="photo-picker-message" role="status">{message}</small>}
    </div>
  );
}

