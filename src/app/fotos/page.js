'use client';

import React, { useState, useEffect, useRef } from 'react';

const FotosPage = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([]);
  const videoRef = useRef(null);
  const photoRef = useRef(null);

  useEffect(() => {
    // Detect if accessed from a mobile device
    const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobile = Boolean(userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i));
    setIsMobile(mobile);

    fetchPhotos();

    // Cleanup camera stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/fotos');
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); // Prefer rear camera
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera: ", err);
      alert("No se pudo acceder a la cámara. Asegúrate de haber dado permisos.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const takePhoto = async () => {
    if (videoRef.current && photoRef.current) {
      const video = videoRef.current;
      const photo = photoRef.current;
      const context = photo.getContext('2d');

      photo.width = video.videoWidth;
      photo.height = video.videoHeight;
      context.drawImage(video, 0, 0, photo.width, photo.height);

      const imageDataURL = photo.toDataURL('image/jpeg');
      await savePhoto(imageDataURL);
      fetchPhotos(); // Refresh photo list

      stopCamera(); // Stop camera after taking photo
    }
  };

  const savePhoto = async (imageDataURL) => {
    try {
      const response = await fetch('/api/fotos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageDataURL }),
      });
      if (!response.ok) {
        throw new Error('Failed to save photo');
      }
      const data = await response.json();
      alert(`Foto guardada en: ${data.path}`);
    } catch (error) {
      console.error('Error saving photo:', error);
      alert('Error al guardar la foto.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gestión de Fotos</h1>

      {!isMobile && (
        <p className="text-red-500 mb-4">
          Esta funcionalidad de cámara está diseñada para dispositivos móviles.
          Puede que no funcione o se comporte de forma inesperada en un escritorio.
        </p>
      )}

      {isMobile && (
        <div className="flex flex-col items-center space-y-4">
          {!cameraActive ? (
            <button onClick={startCamera} className="btn btn-primary btn-lg">
              Acceder a la Cámara
            </button>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-lg shadow-lg"></video>
              <button onClick={takePhoto} className="btn btn-success btn-lg">
                Tomar Foto
              </button>
              <button onClick={stopCamera} className="btn btn-warning">
                Detener Cámara
              </button>
              <canvas ref={photoRef} style={{ display: 'none' }}></canvas>
            </>
          )}
        </div>
      )}

      {!isMobile && (
        <p className="text-gray-600 mt-4">
          Para probar la funcionalidad de la cámara, por favor, accede a esta página desde un dispositivo móvil.
        </p>
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Fotos Guardadas</h2>
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {photos.map((photoPath, index) => (
              <div key={index} className="relative">
                <img src={photoPath} alt={`Foto ${index + 1}`} className="w-full h-auto rounded-lg shadow-md" />
              </div>
            ))}
          </div>
        ) : (
          <p>No hay fotos guardadas.</p>
        )}
      </div>
    </div>
  );
};

export default FotosPage;
