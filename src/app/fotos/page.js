'use client';

import React, { useState, useEffect, useRef } from 'react';

const FotosPage = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const photoRef = useRef(null);

  useEffect(() => {
    // Detect if accessed from a mobile device
    const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobile = Boolean(userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i));
    setIsMobile(mobile);

    // Cleanup camera stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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

  const takePhoto = () => {
    if (videoRef.current && photoRef.current) {
      const video = videoRef.current;
      const photo = photoRef.current;
      const context = photo.getContext('2d');

      photo.width = video.videoWidth;
      photo.height = video.videoHeight;
      context.drawImage(video, 0, 0, photo.width, photo.height);

      const imageDataURL = photo.toDataURL('image/jpeg');
      // Simulate saving and get the path
      const simulatedPath = simulatePhotoStorage();
      console.log("Foto tomada. Ruta simulada:", simulatedPath);
      // In a real app, you would send imageDataURL to a server
      alert(`Foto tomada y guardada simuladamente en: ${simulatedPath}`);
      stopCamera(); // Stop camera after taking photo
    }
  };

  const simulatePhotoStorage = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestampId = now.getTime(); // Unique ID based on timestamp

    return `/public/fotos/${year}/${month}/${day}/${timestampId}.jpg`;
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
    </div>
  );
};

export default FotosPage;
