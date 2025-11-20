import { ImageResponse } from 'next/og';

// Configuración de la imagen
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Generación del icono
export default function Icon() {
  return new ImageResponse(
    (
      // Elemento JSX que se convertirá en imagen
      <div
        style={{
          fontSize: 24,
          background: 'transparent',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        📦 {/* Puedes cambiar este emoji por 🏭, 🛠️, o lo que prefieras */}
      </div>
    ),
    { ...size }
  );
}