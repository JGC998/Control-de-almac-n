// Archivo index para exportar todos los componentes primitivos
// Uso: import { Boton, Entrada, Modal } from '@/componentes/primitivos';

// Componentes principales
export { default as Boton, BotonPrimario, BotonSecundario, BotonPeligro, BotonFantasma } from './Boton';
export { default as Entrada, EntradaNumero, EntradaBusqueda, EntradaEmail, EntradaPassword } from './Entrada';
export { default as Selector } from './Selector';
export { default as AreaTexto } from './AreaTexto';
export { default as Insignia, InsigniaExito, InsigniaError, InsigniaAdvertencia, InsigniaInfo } from './Insignia';
export { default as Tarjeta, TarjetaTitulo, TarjetaContenido, TarjetaAcciones } from './Tarjeta';
export { default as Modal, ModalContenido, ModalAcciones } from './Modal';
export { default as CampoFormulario } from './CampoFormulario';
export { default as Cargando, Esqueleto } from './Cargando';
export { default as Alerta, AlertaExito, AlertaError, AlertaAdvertencia, AlertaInfo } from './Alerta';
