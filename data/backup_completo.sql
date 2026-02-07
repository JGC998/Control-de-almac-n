/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.14-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: almacen_db
-- ------------------------------------------------------
-- Server version	10.11.14-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `BobinaPedido`
--

DROP TABLE IF EXISTS `BobinaPedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `BobinaPedido` (
  `id` varchar(191) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `ancho` double DEFAULT NULL,
  `largo` double DEFAULT NULL,
  `espesor` double DEFAULT NULL,
  `precioMetro` double NOT NULL,
  `color` varchar(191) DEFAULT NULL,
  `costoFinalMetro` double NOT NULL DEFAULT 0,
  `referenciaId` varchar(191) DEFAULT NULL,
  `pedidoId` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `BobinaPedido_referenciaId_fkey` (`referenciaId`),
  KEY `BobinaPedido_pedidoId_fkey` (`pedidoId`),
  CONSTRAINT `BobinaPedido_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `PedidoProveedor` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BobinaPedido_referenciaId_fkey` FOREIGN KEY (`referenciaId`) REFERENCES `ReferenciaBobina` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `BobinaPedido`
--

LOCK TABLES `BobinaPedido` WRITE;
/*!40000 ALTER TABLE `BobinaPedido` DISABLE KEYS */;
/*!40000 ALTER TABLE `BobinaPedido` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Cliente`
--

DROP TABLE IF EXISTS `Cliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Cliente` (
  `id` varchar(191) NOT NULL,
  `nombre` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `direccion` varchar(191) DEFAULT NULL,
  `telefono` varchar(191) DEFAULT NULL,
  `tier` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Cliente_nombre_key` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Cliente`
--

LOCK TABLES `Cliente` WRITE;
/*!40000 ALTER TABLE `Cliente` DISABLE KEYS */;
INSERT INTO `Cliente` VALUES
('00694038-f2f9-4375-8f43-44f07f09cd61','BORJA PEREZ CONSTRUMAQ','construmaq123@gmail.com',NULL,'605142737',NULL),
('00a48cdb-648f-4bc7-b1c6-10df0f6c1cf7','NOLI','contact@noli.es','Av. Juan Carlos I, 34, 14520 Fernán Núñez, Córdoba','957 38 01 50','FABRICANTE'),
('087fc3ca-a46e-4446-b78d-af8ba10efc5f','MARTRIN ALLON','NO@NO',NULL,'677349269',NULL),
('0b845d78-299e-4b62-a248-9a390dcd011d','AGROSERVCICOS LOS RUMANOS ','NO@NO',NULL,'627025033',NULL),
('0c0e29fe-f742-4d15-970d-6f18b3752798','TALLERES MATA CAMPOS','tmatacampos-tmc@hotmail.com',NULL,'653883967',NULL),
('0c830507-4d6f-47ec-bf30-6d4ac7c4e1ea','SCA SAN JUAN BAUTISTA (SOLERA)','NO@NO',NULL,'953 39 40 37',NULL),
('116b9cc5-b1f2-4e5e-ae4f-57da25b58de0','AGROVINDEL SC','NO@NO',NULL,'652389328',NULL),
('134edd07-8789-46b9-9efd-1d46e4b42ad3','FRANCISCO MIGUEL (ESPEJO)','NO@NO',NULL,'663365758',NULL),
('1ae1103e-aa67-4f95-a219-3f445352a3ae','AGROTORRES ','m.pedraza@serrot.net',NULL,'660 80 49 13',NULL),
('28998a4d-f858-40fe-b480-3d0a651f0ddd','ANTONIO LOPEZ','admon.ajlopezjimenez@gmail.com',NULL,'660710373',NULL),
('2a89316f-920d-4283-ae84-54eac545fc9c','FERNANDO (ALICUN DE ORTEGA)','NO@NO',NULL,'656 96 04 27',NULL),
('3672d58d-9ef9-469d-b8ea-b6f4ca1fbf78','IBERBAG','administracion@iberbacgrup.com',NULL,'918095121',NULL),
('38ff84ff-8dc5-434e-ada3-3ff4b6a777f5','TARIFA','TARIFA@TARIFA',NULL,'1',NULL),
('3a5b2c4a-90c6-4308-a609-c27cc70eeeb2','ANGEL MELLADO','NO@NO',NULL,'606960002',NULL),
('4028c8c9-3905-4598-8638-d5b0cee90fdf','ESPEJO VIDELSUR','NO@NO',NULL,'606967997',NULL),
('403fe7ae-36dc-414d-8ae3-3216178d7037','HMNOS ANDREU BOSQUE','NO@NO','Calle Martires 4544640, Torrecilla De Alcañiz (Teruel). España','676156557',''),
('49100c22-9f14-4443-affd-6f10378fbec8','Guadagri','guadagri@gmail.com',NULL,'957610089',NULL),
('4a7f2f37-6947-4bb2-b83f-b02168bbb67d','RAFAEL BELDA MARTINEZ','NO@NO',NULL,'696391964',NULL),
('4fee21ba-1568-4d03-af15-6ad65b7d3d3f','BENIGNO ','NO@NO',NULL,'630 04 27 61',NULL),
('5351fb6f-6041-4b5c-a19b-107e91212ec7','FRANCISCO JIMNEZ ','NO@NO',NULL,'627907700',NULL),
('5e98ffb7-1f10-4b35-bbb5-8a5cd8610b6b','TECNIAGRI','tecniagri@gmail.com',NULL,'651990277',NULL),
('63a00178-ec99-484e-8156-d99cbefc777a','JOAMORENO','ferreteriajoamoreno@gmail.com',NULL,'00000000',NULL),
('63f5cd0c-05d1-494d-bf06-a869033f403c','OLIOJAEN','administracion@suminsitrosoliojaen.com',NULL,'625564682',NULL),
('665e2b41-dd0f-458d-bbc0-6566746ea6e1','AGROSERVCIOS  FERNAN NUÑEZ','NO@NO',NULL,'6879425332',NULL),
('6787643f-bc05-4b7e-bda2-1f9029130b6c','METALICAS EL PORTEZUELO','metalicas.elportezuelo@gmail.com',NULL,'665557106',NULL),
('78462b6d-d724-4520-b1d7-a454e237a220','AGRO RONCHA ','NO@NO',NULL,'618312531',NULL),
('789cbaf1-e18d-43c3-89a9-e025bbbea7d4','AUTORECAMBIOS MANSILLA ','auto@recambiosmansilla.com',NULL,'638155822',NULL),
('79d88d0e-02b8-46ae-adab-cdfbf1aa1852','PROMAGRI','NO@NO',NULL,'1',NULL),
('7b582b63-ca45-4009-ac24-2c5418a8804d','ANTONIO FRANCISCO TRUJILLO (COOP LUCENA)','NO@NO',NULL,'696626707',NULL),
('80101bde-86cc-49de-85ba-933d37fc06a6','JOSE IGNACIO ESPINOSA','joseignacioespinosaruiz@gmail.com',NULL,'676792901',NULL),
('80746e2a-2335-4a47-95b4-6846e555d4ed','INDUSTRIAS BARRAZA','compras@industriasbarraza.com',NULL,'645838169',NULL),
('83ba58db-a8ef-4fe0-a5c3-d1b7a7a2a400','HERMANOS MOLINA','NO@NO',NULL,'659058998',NULL),
('84766839-76ed-484a-aa38-670f8b4701d5','CRISPE','crispemaquinaria@gmail.com',NULL,'653279332',NULL),
('8fe63149-1e66-489f-b407-035ae1063f6b','LOS LUCAS','NO@NO',NULL,'651449482',NULL),
('91b73195-3e34-43ce-87a3-1d2a76ccf7d2','ANGEL (MADRID-ESPEJO)','NO@NO',NULL,'639703475',NULL),
('939d4c8d-5f60-4d45-9b27-1635415d318c','CONSTRUCCIONES VAZQUEZ SOTO','info@metalicasvazquez.com',NULL,'660 80 49 13',NULL),
('955dd746-8273-4124-844c-dabce3d42e64','PANDI TALLERES ','elpandi2000@gmail.com',NULL,'623 01 04 70',NULL),
('a5fe074d-8f24-43c6-b501-419e6e56183e','LUIS (CASTELLAR DE SANTIAGO)','NO@NO',NULL,'696531846',NULL),
('b1d76bef-25be-4297-8f8c-20b0fa0c957a','HIJOS DE RUIZ VELA ','hijosruizvela@hotmail.es',NULL,'630098202',NULL),
('b1da9fc8-4dad-487b-9cc5-57ab85f33f89','CORTIJOS CC','NO@NO',NULL,'646565057',NULL),
('b2d7089b-68ec-408a-b595-2157ff3e4dfe','EUGENIO (CASTELLAR DE SANTIAGO)','NO@NO',NULL,'638622881',NULL),
('ba20c1ab-b8d1-47aa-bd85-6a64ec85ca49','SIMON (MONTERRUBIO DE LA SERENA)','NO@NO',NULL,'677102510',NULL),
('bde60a9a-68ac-49ec-87cb-9e225ceabc00','BAUTISTA SANTILLANA','compras@bautistasantillana.com',NULL,'00000000',NULL),
('be2d3103-a0c4-4358-b63f-92d3a33388d0','JUAN JOSE GARCIA ARENAS ','ALBORREA@NO',NULL,'696090479',NULL),
('bee657aa-a176-4556-9178-e5845c3ec978','AGROISA','compras@agroisa.com',NULL,'958335003',NULL),
('c7472f46-7e69-452b-b53e-3a49788f78b5','JYC TUBERIAS ','administracion@jyc-ta.com',NULL,'633122910',NULL),
('cli-001','ALDAMA','info@vibradoresaldama.com','Crta. Autonómica A-386 KM. 21,5  14540 La Rambla (Córdoba)','627 29 26 05   -  610 96 40 93  -   620 07 50 26',''),
('cli-003','AGRUIZ','','','113','FABRICANTE'),
('cli-004','MORESIL','moresil@contacto.es','Carretera de Córdoba, km. 31, 14730 Palma del Río, Córdoba','957 63 02 43','FABRICANTE'),
('cli-005','FERRETERIA UBETENSE','ubetense@ferreteria.es','Ctra. Córdoba-Valencia, 23400 Úbeda, Jaén','953 75 09 22','INTERMEDIARIO'),
('cli-006','LA PREFERIDA','castillero@maquinarialapreferida.com','Ctra. La Rambla, 2 14548 - Montalbán (Córdoba) España','336','CLIENTE FINAL'),
('cli-007','ANTONIO ARTUGAL','info@maquinariaartugal.com','Polígono Los Lucas, Parcela 52 14548 - Montalbán de Córdoba España','957 310 683 / 660 710 373','CLIENTE FINAL'),
('d08b5107-11a9-40f3-abf8-9b666f397914','ANA MARIA BARQUERO','NO@NO',NULL,'666784332',NULL),
('d69395af-b2d5-4ce1-bdb5-7c289a6ac118','SALAGRI CB','salagrimontalban@hotmail.com',NULL,'00000000',NULL),
('d7d5aa31-c00a-44c6-9a6e-158c602af336','MAQUINARIA GARRIDO','compras@topavi.es',NULL,' 941 390 360',NULL),
('dd35e1d3-16b7-45fa-a566-341c5d56307c','JACOBO AGRICULTURA MANCHEGA','NO@NO',NULL,'646290993',NULL),
('e6b51638-5da4-442d-b883-e89c09917449','JOSE MARIA LOPEZ LOPEZ ','NO@NO',NULL,'660068898',NULL),
('e721783e-2e31-4ca6-aa8c-cb9b1fbcdf6e','INDUAGRO','NO@NO',NULL,'692092429',NULL),
('ea058e6f-acc3-4d15-8ee2-3b47f46abe59','EXPORT AGRICOLA','exportagricola@yahoo.es',NULL,'953280000',NULL),
('f24b8421-ecc0-4a98-9e91-62af124426c2','AGRICOLA DON NARCISO ','agricoladonnarciso@gmail.com',NULL,'686 68 78 64',NULL),
('f7607589-8128-409c-a4c1-128b79cf7731','VIBROMART','','Av. del Parque, 120, 18330 Chauchina, Granada','958 44 74 31',''),
('fc7b3659-89fa-4c03-a690-262e6f1a82ba','BANDAS ROBERO ','administracion@robero.es',NULL,'670311211',NULL);
/*!40000 ALTER TABLE `Cliente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Config`
--

DROP TABLE IF EXISTS `Config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Config` (
  `id` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `value` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Config_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Config`
--

LOCK TABLES `Config` WRITE;
/*!40000 ALTER TABLE `Config` DISABLE KEYS */;
/*!40000 ALTER TABLE `Config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DescuentoTier`
--

DROP TABLE IF EXISTS `DescuentoTier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `DescuentoTier` (
  `id` varchar(191) NOT NULL,
  `cantidadMinima` int(11) NOT NULL,
  `descuento` double NOT NULL,
  `reglaId` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `DescuentoTier_reglaId_fkey` (`reglaId`),
  CONSTRAINT `DescuentoTier_reglaId_fkey` FOREIGN KEY (`reglaId`) REFERENCES `ReglaDescuento` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DescuentoTier`
--

LOCK TABLES `DescuentoTier` WRITE;
/*!40000 ALTER TABLE `DescuentoTier` DISABLE KEYS */;
/*!40000 ALTER TABLE `DescuentoTier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Documento`
--

DROP TABLE IF EXISTS `Documento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Documento` (
  `id` varchar(191) NOT NULL,
  `tipo` varchar(191) NOT NULL,
  `referencia` varchar(191) NOT NULL,
  `descripcion` varchar(191) DEFAULT NULL,
  `rutaArchivo` varchar(191) NOT NULL,
  `fechaSubida` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `productoId` varchar(191) DEFAULT NULL,
  `maquinaUbicacion` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Documento_referencia_rutaArchivo_key` (`referencia`,`rutaArchivo`),
  KEY `Documento_productoId_fkey` (`productoId`),
  CONSTRAINT `Documento_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Documento`
--

LOCK TABLES `Documento` WRITE;
/*!40000 ALTER TABLE `Documento` DISABLE KEYS */;
INSERT INTO `Documento` VALUES
('215c9e9b-c066-4359-a81c-a803e6b9657c','PLANO','UPI1665A','Versión 24/11/2025','/planos/IMG_20251127_113034.jpg','2025-11-27 10:34:39.238','7d0ff99d-38ce-4500-936c-3a00995bddc7',NULL);
/*!40000 ALTER TABLE `Documento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Fabricante`
--

DROP TABLE IF EXISTS `Fabricante`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Fabricante` (
  `id` varchar(191) NOT NULL,
  `nombre` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Fabricante_nombre_key` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Fabricante`
--

LOCK TABLES `Fabricante` WRITE;
/*!40000 ALTER TABLE `Fabricante` DISABLE KEYS */;
INSERT INTO `Fabricante` VALUES
('9684945d-bdac-4cef-b582-6d0f52ed749b','Agruiz'),
('142c6a37-5523-40cf-91f1-e89ef8daf256','Aldama'),
('10a448b4-134c-44c1-8008-057f99118b8f','ARCUSIN'),
('af115af4-4e2b-4a9e-8e66-e4ae5522db61','ARTUGAL'),
('657d4304-81f5-41ba-b16f-36345613812d','Bautista Santillana'),
('67fe8445-32f2-4b3a-b6ea-c01d873be592','CASTILLERO INFANTE'),
('bed69565-4946-41db-8fe0-c9d4f80d0323','Crispe '),
('7870feb9-485f-4846-8837-8d9d9a8d08b1','FIELTRO'),
('dcfd8882-136e-414d-be69-c04ccaed67fc','Halcon'),
('c145f1a4-40d1-4c0b-a932-d9e32b6e7def','Industrias Barraza'),
('b00293a9-f63c-435b-abf0-9d4b9179e901','MAI'),
('08ddba14-4aef-4fdb-a054-787890a5e3bd','MARTIN BOHORQUEZ'),
('2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','METRAJE CAUCHO'),
('5a897571-79ed-4838-870d-b69fcda0decc','Moresil'),
('6dca7196-e784-4e9c-b51c-0426ff12481a','Noli'),
('9a41ec85-62b4-4143-9a10-11f899a390a4','PELLENC'),
('de99a3d9-daff-49f4-a2a6-9403024c7832','PROMAGRI'),
('960454c8-41f1-4130-9dbe-3768cae85787','PVC'),
('52ffe75e-5258-464f-8c34-4f7573058db3','ROLLO FIELTRO'),
('7aa286b7-85e6-4b01-9529-bf82d7033454','SOLANO HORIZONTES'),
('a47d6b67-80bc-44c2-a632-debffc165460','TALLERES MATA CAMPOS'),
('f77a0d4d-51aa-463c-9ff9-18bce94a3273','Topavi'),
('5ad3cb21-198f-4e6c-84b5-0642631474b2','Vibromart'),
('7121de23-fc0f-4546-b8a8-5e81c8b3d4bb','VIDELSUR');
/*!40000 ALTER TABLE `Fabricante` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Material`
--

DROP TABLE IF EXISTS `Material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Material` (
  `id` varchar(191) NOT NULL,
  `nombre` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Material_nombre_key` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Material`
--

LOCK TABLES `Material` WRITE;
/*!40000 ALTER TABLE `Material` DISABLE KEYS */;
INSERT INTO `Material` VALUES
('82581a70-ecf5-408e-bc3b-86b4b6d44232','BORDE ONDULADO 80MM'),
('dd75928d-14b3-4941-b1c6-00cf07106c73','CARAMELO'),
('03bd9047-5c1c-4503-9013-5eb6db24f92c','FIELTRO'),
('fcc28f2d-0cfc-4c04-b266-cfa9b55371b7','GOMA'),
('0c460231-4966-4509-a689-cc24c48b156f','GOMA BLANDA'),
('48724242-7ee7-4ee1-9b9f-9fe10f3798b9','PVC'),
('bb9169f9-0b06-48ca-9b2b-89e0c7608ea2','ROLLO FIELTRO'),
('8ba9283e-2e1c-4425-956d-5499ec1f94c5','TACO PINZA'),
('0a5428e1-c6c9-41fd-b253-76494aa61e90','VERDE');
/*!40000 ALTER TABLE `Material` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MovimientoStock`
--

DROP TABLE IF EXISTS `MovimientoStock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `MovimientoStock` (
  `id` varchar(191) NOT NULL,
  `tipo` varchar(191) NOT NULL,
  `cantidad` double NOT NULL,
  `fecha` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `referencia` varchar(191) DEFAULT NULL,
  `stockId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `MovimientoStock_stockId_fkey` (`stockId`),
  CONSTRAINT `MovimientoStock_stockId_fkey` FOREIGN KEY (`stockId`) REFERENCES `Stock` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MovimientoStock`
--

LOCK TABLES `MovimientoStock` WRITE;
/*!40000 ALTER TABLE `MovimientoStock` DISABLE KEYS */;
/*!40000 ALTER TABLE `MovimientoStock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Nota`
--

DROP TABLE IF EXISTS `Nota`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Nota` (
  `id` varchar(191) NOT NULL,
  `content` varchar(191) NOT NULL,
  `fecha` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Nota`
--

LOCK TABLES `Nota` WRITE;
/*!40000 ALTER TABLE `Nota` DISABLE KEYS */;
INSERT INTO `Nota` VALUES
('a4a12932-5c22-4551-bd72-9e75941fee76','Darle de comer a pelusa','2025-11-27 17:34:20.407');
/*!40000 ALTER TABLE `Nota` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Pedido`
--

DROP TABLE IF EXISTS `Pedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Pedido` (
  `id` varchar(191) NOT NULL,
  `numero` varchar(191) NOT NULL,
  `fechaCreacion` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `estado` varchar(191) NOT NULL,
  `notas` varchar(191) DEFAULT NULL,
  `subtotal` double NOT NULL,
  `tax` double NOT NULL,
  `total` double NOT NULL,
  `clienteId` varchar(191) DEFAULT NULL,
  `presupuestoId` varchar(191) DEFAULT NULL,
  `marginId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Pedido_numero_key` (`numero`),
  UNIQUE KEY `Pedido_presupuestoId_key` (`presupuestoId`),
  KEY `Pedido_clienteId_fkey` (`clienteId`),
  CONSTRAINT `Pedido_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Pedido_presupuestoId_fkey` FOREIGN KEY (`presupuestoId`) REFERENCES `Presupuesto` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Pedido`
--

LOCK TABLES `Pedido` WRITE;
/*!40000 ALTER TABLE `Pedido` DISABLE KEYS */;
INSERT INTO `Pedido` VALUES
('01e293df-7dfb-4acf-a7f8-e3bd27c41db5','PED-2026-075','2026-01-20 12:00:50.806','Completado','EN 12 MM DE ESPESOR \n\nQUIERE QUE LAS LONAS SE QUEDEN EN LA PARTE DE ABAJO ',92.32,19.39,111.71,'5351fb6f-6041-4b5c-a19b-107e91212ec7',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('04e65ed1-b4d6-4f63-8285-080bd1c06f68','PED-2025-019','2025-12-09 17:21:15.317','Completado','CASTILLERO \n400X6.000MM S/FIN CON TACOS R40X380 P300\n\nARTUGAL \n470X6.000MM S/FIN \nCON TACSO R50X400? P300',0,0,0,'28998a4d-f858-40fe-b480-3d0a651f0ddd',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('098a30d6-02c1-4627-9a56-9dfcdf195c5e','PED-2025-004','2025-11-28 11:10:17.780','Completado','',437.54,91.88,529.42,'b1d76bef-25be-4297-8f8c-20b0fa0c957a',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('0badc652-8024-45b7-8408-5d8db3fe9aa5','PED-2025-034','2025-12-18 08:41:13.214','Completado','1 PIEZA 3 LONAS MEDIDA 800X1200',26.7,5.61,32.31,'5e98ffb7-1f10-4b35-bbb5-8a5cd8610b6b',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('0be30572-579e-4d32-8be1-e0ce678e5ff5','PED-2025-026','2025-12-10 18:13:08.571','Completado','1 ROLLO DE F15 550X10.000',152.8,32.09,184.89,'b1da9fc8-4dad-487b-9cc5-57ab85f33f89',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('0e1a00cd-a302-4f0c-8f01-f12a92ee8085','PED-2026-082','2026-01-23 17:41:03.381','Completado','PEDIDO N F600001',0,0,0,'cli-004',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('11eaed65-7f88-4cb0-ab25-c90c134a1f05','PED-2025-017','2025-12-09 09:23:07.639','Completado','',235.88,49.53,285.41,'134edd07-8789-46b9-9efd-1d46e4b42ad3',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('18394451-bf05-4f47-a07b-76428be0e32b','PED-2026-063','2026-01-14 12:03:12.878','Completado','MODELO ENTERO (TROQUEL)',32.08,6.74,38.82,'7b582b63-ca45-4009-ac24-2c5418a8804d',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('1f3fc730-f81e-4c6a-9de0-3a280be550a0','PED-2025-021','2025-12-10 17:21:00.472','Completado','PEDIDO N R 637',865.5,181.75,1047.26,'00a48cdb-648f-4bc7-b1c6-10df0f6c1cf7',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('1f69dfad-6866-4104-84f0-52b6ab505171','PED-2025-029','2025-12-10 18:27:22.083','Completado','2 PIEZAS 800X1350MM',106.56,22.38,128.94,'0b845d78-299e-4b62-a248-9a390dcd011d',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('280c8dce-dde7-41cd-b794-e0e7ea07e0a2','PED-2026-072','2026-01-19 17:25:49.562','Completado','PEDIDO N 26-34',852.3,178.98,1031.28,'ea058e6f-acc3-4d15-8ee2-3b47f46abe59',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('2d91d939-6880-4733-965f-2907645f2682','PED-2026-078','2026-01-21 08:58:23.409','Completado','ENVIO A CALLE CENTRAL N 6\n03830 MURO DE ALCOY',1294.2,271.78,1565.98,'4a7f2f37-6947-4bb2-b83f-b02168bbb67d',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('326f5570-d18f-4171-bc9b-84d6656bfd55','PED-2026-080','2026-01-21 11:32:41.485','Borrador','2 TACOS VIBROMART DUROS \n2 SIDMBLOCKS M16\nENVIAR',51.5,10.81,62.31,'b2d7089b-68ec-408a-b595-2157ff3e4dfe',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('3493b3bb-ea7d-4d3e-abab-976335dceb69','PED-2025-040','2025-12-23 12:01:48.552','Completado','Pedido para enero, para ella tener en la estantería',870.75,182.86,1053.61,'f7607589-8128-409c-a4c1-128b79cf7731',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('35add1e3-1cc6-435c-b48f-fdfcf7ee50fb','PED-2026-050','2026-01-02 09:42:44.650','Completado','',573.45,120.42,693.87,'80746e2a-2335-4a47-95b4-6846e555d4ed',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('367b6c1c-5a73-4a03-a0cb-b29beecbeb3c','PED-2025-049','2025-12-30 10:09:51.079','Completado','',874.08,183.56,1057.64,'4fee21ba-1568-4d03-af15-6ad65b7d3d3f',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('370c0a65-a2f3-4110-add0-c3405271b995','PED-2026-087','2026-02-05 08:57:26.531','Borrador','LLAMAR AL 696531846\nCASTELLAR DE SAANTIAGO',222.64,46.75,269.39,'a5fe074d-8f24-43c6-b501-419e6e56183e',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('392fb756-17a1-418c-ac93-b785f998201e','PED-2026-054','2026-01-07 10:18:13.781','Completado','',795.9,167.14,963.04,'cli-005',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('39a58a89-64cf-4c3f-a48f-0aeef8fada71','PED-2025-015','2025-12-05 08:39:57.438','Completado','20 METROS DE 500/4',370.2,77.74,447.94,'ea058e6f-acc3-4d15-8ee2-3b47f46abe59',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('3a989b70-c228-40ed-b745-8346aa274bb6','PED-2026-057','2026-01-08 11:10:52.242','Completado','',512.4,107.6,620,'2a89316f-920d-4283-ae84-54eac545fc9c',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('3e0eac31-c9e1-4900-b5e7-d1f9beb4ccb0','PED-2026-086','2026-02-04 09:26:58.397','Borrador','',325.5,68.36,393.86,'bee657aa-a176-4556-9178-e5845c3ec978',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('411ff7da-feeb-4f20-b44b-a1c20bafa9cc','PED-2025-024','2025-12-10 17:51:07.385','Completado','',122.22,25.67,147.89,'3a5b2c4a-90c6-4308-a609-c27cc70eeeb2',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('41794bf7-80c2-4cad-b015-116ead721249','PED-2025-032','2025-12-15 16:06:33.394','Completado','',493.8,103.7,597.5,'116b9cc5-b1f2-4e5e-ae4f-57da25b58de0',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('435b3aec-3892-42da-a805-8bc30dafbadd','PED-2025-038','2025-12-22 17:23:06.780','Completado','150 MTS F10-*600\nENVIO A PORTUGAL POR PALLEX',1260,264.6,1524.6,'bde60a9a-68ac-49ec-87cb-9e225ceabc00',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('46c73ded-bb7a-4a96-b8ab-04ee5460ec68','PED-2026-083','2026-01-24 10:29:41.501','Completado','BANDA PVC B3 MEDIDA 600X5.700MM C/GRAPA ',0,0,0,'0c830507-4d6f-47ec-bf30-6d4ac7c4e1ea',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('49fcd227-15cc-46d9-8ff8-64bd11e71f74','PED-2025-010','2025-12-02 13:04:48.675','Completado','',1065.76,223.81,1289.57,'0b845d78-299e-4b62-a248-9a390dcd011d',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('4c8300d7-a04c-4621-b8ef-ce0847cb09ef','PED-2025-037','2025-12-22 09:04:37.766','Completado','',45.84,9.63,55.47,'1ae1103e-aa67-4f95-a219-3f445352a3ae',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('51f2be32-3034-4a34-bed7-5e5b429ac7c0','PED-2026-059','2026-01-08 15:56:41.561','Completado','',339.73,71.34,411.07,'3672d58d-9ef9-469d-b8ea-b6f4ca1fbf78',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('53e8829c-4da6-47ad-8064-fb55ec224d4e','PED-2025-011','2025-12-03 11:05:21.398','Completado','',1380.45,289.89,1670.34,'79d88d0e-02b8-46ae-adab-cdfbf1aa1852',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('54e182f3-9e37-4835-a12e-2b299e1bb2ae','PED-2026-070','2026-01-19 09:39:34.140','Completado','',630.95,132.5,763.44,'80746e2a-2335-4a47-95b4-6846e555d4ed',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('550cba60-d247-46d3-a6aa-f792833b6c27','PED-2026-064','2026-01-14 12:04:19.817','Completado','',427.5,89.77,517.27,'84766839-76ed-484a-aa38-670f8b4701d5',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('56ec79e7-2dd8-4aec-ab56-fa0bf0ebaa83','PED-2025-045','2025-12-26 11:36:08.754','Completado','PEDIDO N 664\n15 MTS 500/4 10MM\n15 MTS 500/4 14MM',710.32,149.17,859.49,'00a48cdb-648f-4bc7-b1c6-10df0f6c1cf7',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('579659a0-d7d4-4e96-a7ef-c974b0322615','PED-2025-035','2025-12-18 08:45:48.799','Completado','1 ROLLO DE 600X36.5 MTS',1.68,0.35,2.03,'6787643f-bc05-4b7e-bda2-1f9029130b6c',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('599da2d1-bebc-4701-a186-a3d393dbdf9f','PED-2026-081','2026-01-23 08:54:51.085','Completado','PEDIDO N D620050',0,0,0,'cli-004',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('5a94a2c3-ee30-478e-953b-67e90abb1923','PED-2026-085','2026-01-28 09:31:28.617','Borrador','LA DE MARTIN BOHORUQEZ CON AGUEJROS DE NOLI 500\n\nY 4 PIEZAS DE 500 EN 12MM LONGIOTUD 2,20 MTS',208.15,43.71,251.86,'d69395af-b2d5-4ce1-bdb5-7c289a6ac118',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('5dc19932-ed03-4aab-85c9-129bff41ca46','PED-2026-069','2026-01-19 09:30:05.780','Completado','ENVIAR ON 50 MTS BORDE ONDULADO DE GOMA 80MM',1083,227.43,1310.43,'f7607589-8128-409c-a4c1-128b79cf7731',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('5e75845c-1429-4219-900e-e298542795b1','PED-2026-053','2026-01-07 10:13:44.180','Completado','',272.16,57.15,329.31,'955dd746-8273-4124-844c-dabce3d42e64',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('5f04e81e-42b2-4676-b4ea-4d80ffd91761','PED-2025-003','2025-11-28 08:49:38.665','Completado','',1120.24,235.25,1355.5,'63a00178-ec99-484e-8156-d99cbefc777a',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('614cc2fb-798e-4504-8832-66abb7800eb6','PED-2025-013','2025-12-03 13:02:40.912','Completado','',630.72,132.45,763.17,'cli-004',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('61abe5dd-656a-4342-9d79-3bdc346aa070','PED-2026-079','2026-01-21 10:56:54.622','Completado','20 MTS DE BORDE ONDULADO DE 80MM',0,0,0,'789cbaf1-e18d-43c3-89a9-e025bbbea7d4',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('61fa9ed4-e836-4f29-9eb2-4e4d7d950fa4','PED-2025-018','2025-12-09 09:28:34.591','Completado','1 ROLLO 600X10.000',111.96,23.51,135.47,'4a7f2f37-6947-4bb2-b83f-b02168bbb67d',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('63277d04-a5ad-4056-a565-1a8269b5d7c7','PED-2025-042','2025-12-26 10:18:27.826','Completado','',444,93.24,537.24,'ea058e6f-acc3-4d15-8ee2-3b47f46abe59',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('663d36fe-40f9-4164-b8e3-c8aedc0b3f54','PED-2026-084','2026-01-27 16:41:07.333','Completado','10 SABANAS\n50 PATINES\n20 PVC LARGAS\n20 PVC PEQUEÑAS',213.75,44.89,258.64,'84766839-76ed-484a-aa38-670f8b4701d5',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('6c508912-3b94-4585-83ec-5244c155bb26','PED-2026-071','2026-01-19 09:58:57.452','Completado','ENVIO A PORTUGAL',1260,264.6,1524.6,'bde60a9a-68ac-49ec-87cb-9e225ceabc00',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('704e0ad3-19cd-4b3f-908e-124298c4ca5f','PED-2025-039','2025-12-23 09:44:02.401','Completado','PVC 6X170X1920MM',0,0,0,'84766839-76ed-484a-aa38-670f8b4701d5',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('73cc36bf-9cbe-4618-8ed1-54789f4aba6a','PED-2025-027','2025-12-10 18:16:30.649','Completado','',134.76,28.3,163.06,'665e2b41-dd0f-458d-bbc0-6566746ea6e1',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('7491a6c7-ccd2-4159-a6aa-f06ebcbca414','PED-2026-058','2026-01-08 11:48:41.463','Completado','',94,19.74,113.74,'be2d3103-a0c4-4358-b63f-92d3a33388d0',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('765f7b91-40f4-4be1-b94b-fee402204b46','PED-2025-023','2025-12-10 17:32:36.082','Completado','',93.24,19.58,112.82,'00694038-f2f9-4375-8f43-44f07f09cd61',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('780048af-fcd2-4ef5-a60e-c29563c5dbcf','PED-2025-008','2025-12-01 14:39:50.234','Completado','',271.4,56.99,328.39,'49100c22-9f14-4443-affd-6f10378fbec8',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('7c6ffa5f-6c6d-49d0-9594-f09a6b2bfd36','PED-2026-067','2026-01-14 17:55:59.445','Completado','José María López López \nC/ molinillo 81 \nCastellar De Santiago \nCiudad Real',341.64,71.74,413.38,'e6b51638-5da4-442d-b883-e89c09917449',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('8c551612-bbb7-4427-b93e-80789bd4f1d8','PED-2026-073','2026-01-20 11:42:10.107','Completado','',487.76,102.43,590.19,'939d4c8d-5f60-4d45-9b27-1635415d318c',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('8f4975bb-dbaf-4c7c-a6a1-eefff5d088c2','PED-2025-041','2025-12-26 10:16:00.831','Completado','pedido n C25009515',215.95,45.35,261.3,'cli-005',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('911547a9-d073-49cc-b919-dbe6e070efb7','PED-2026-077','2026-01-20 18:14:53.579','Completado','',1729,363.09,2092.09,'cli-005',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('91613b64-0c48-4e21-b454-230dd185c8c7','PED-2025-025','2025-12-10 17:57:32.176','Completado','6000891 RIGIZALIZADOR \n60008A06 FALDON NUEVO 2 LONAS',1313.31,275.8,1589.11,'80746e2a-2335-4a47-95b4-6846e555d4ed',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('952137c1-962b-4c51-b195-26f7fcbd5257','PED-2025-044','2025-12-26 10:28:47.435','Completado','',0,0,0,'83ba58db-a8ef-4fe0-a5c3-d1b7a7a2a400',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('978781e7-825c-46ce-be5c-231dc8328b47','PED-2025-031','2025-12-12 12:55:07.344','Completado','TROQUEL',37.32,7.84,45.16,'087fc3ca-a46e-4446-b78d-af8ba10efc5f',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('97e6fd1a-d303-42e1-9417-bad3c2439bed','PED-2025-022','2025-12-10 17:26:02.656','Completado','PEDIDO N 2025134',1158.75,243.34,1402.09,'0c0e29fe-f742-4d15-970d-6f18b3752798',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('9bc663cf-85b5-41f7-bf4a-32afea564f8d','PED-2026-066','2026-01-14 17:49:07.945','Completado','6 ROLLOS DE FIELTRO 15MM ANCHO 500X10MTS DE LARGO ',1163.47,244.33,1407.8,'63a00178-ec99-484e-8156-d99cbefc777a',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('9f6812d7-f7f2-4975-8dad-ae2736281bc1','PED-2025-048','2025-12-30 10:04:44.680','Completado','BAUTISTA SANTILLANA CON DOBLE PERFORACION EN UN EXTREMO ',1707.8,358.64,2066.44,'78462b6d-d724-4520-b1d7-a454e237a220',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('a578d609-2912-4221-92c6-617b635a11aa','PED-2026-062','2026-01-13 11:40:41.505','Completado','',423.94,89.03,512.96,'63f5cd0c-05d1-494d-bf06-a869033f403c',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('b094b996-4a31-4733-9256-931db16ea967','PED-2025-012','2025-12-03 12:40:13.024','Completado','SEGUNDO PEDIDO',870.75,182.86,1053.61,'f7607589-8128-409c-a4c1-128b79cf7731',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('b90f51c7-6e49-4246-89b0-8cde4da7b6ae','PED-2026-051','2026-01-02 09:45:18.295','Completado','',274.09,57.56,331.64,'8fe63149-1e66-489f-b407-035ae1063f6b',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('bcf3e11b-bff0-4c7b-b132-4fe45ff4118a','PED-2025-043','2025-12-26 10:22:14.620','Completado','PEDIDO N U5200560 ',69.3,14.55,83.85,'cli-004',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('be972e6b-9fc6-4240-8a03-e3bb47ceb512','PED-2025-028','2025-12-10 18:20:31.943','Completado','ENVIAR POR LUNA',82.88,17.4,100.28,'e721783e-2e31-4ca6-aa8c-cb9b1fbcdf6e',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('c52aa0b7-7253-4b85-a643-9ea3cbc99958','PED-2026-061','2026-01-12 11:38:08.280','Completado','CON DOBLE COJIDA A UN LADO \nTROQUEL ',27.64,5.8,33.44,'91b73195-3e34-43ce-87a3-1d2a76ccf7d2',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('c54d35cb-87cf-4950-ac89-1ed219c86aa5','PED-2026-074','2026-01-20 11:45:37.681','Completado','BANDA PVC B3 MEDIDA 3900X550 CERRADA SIN FIN',0,0,0,'cli-007',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('cf0fd583-57c3-43b1-a4c5-245d996a7ff9','PED-2026-065','2026-01-14 17:42:53.652','Completado','4 PIEZA DE CA8 150X2600',106.68,22.4,129.08,'fc7b3659-89fa-4c03-a690-262e6f1a82ba',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('d292dd91-374e-4bd6-8fbf-1daedc46712a','PED-2026-056','2026-01-08 11:02:59.028','Completado','',371.4,77.99,449.39,'f24b8421-ecc0-4a98-9e91-62af124426c2',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('d3f2e1c7-5ae4-4f61-b426-7569ba833a7c','PED-2026-076','2026-01-20 12:29:47.300','Completado','',651,136.71,787.71,'cli-001',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('d544052e-9ab1-429c-85f8-8d089396d88c','PED-2025-030','2025-12-10 18:33:40.358','Completado','',123.02,25.84,148.86,'63f5cd0c-05d1-494d-bf06-a869033f403c',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('d7e793d5-7711-4993-8f1a-0e64509f7cea','PED-2026-060','2026-01-09 09:47:47.238','Completado','',179.28,37.65,216.93,'4028c8c9-3905-4598-8638-d5b0cee90fdf',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('d9187915-2467-43ed-b7d4-4e406d67c78a','PED-2025-014','2025-12-05 07:26:13.401','Completado','',215.95,45.35,261.3,'49100c22-9f14-4443-affd-6f10378fbec8',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('e0e0b152-be27-4f7f-ae27-bc114c7ddf98','PED-2025-009','2025-12-02 08:43:58.754','Completado','',870.75,182.86,1053.61,'f7607589-8128-409c-a4c1-128b79cf7731',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('e345a881-c97a-4b6f-964b-d45d188f3374','PED-2025-020','2025-12-10 17:11:37.962','Completado','pedido n 25-606 y 25-600',2074.08,435.56,2509.64,'ea058e6f-acc3-4d15-8ee2-3b47f46abe59',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('e49743c4-ae0d-4867-bfc8-9eba584308c0','PED-2025-033','2025-12-18 08:38:07.453','Completado','',473.9,99.52,573.42,'ba20c1ab-b8d1-47aa-bd85-6a64ec85ca49',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('e7e039f3-f0cd-4a73-9895-8c5bde6d9a4f','PED-2025-047','2025-12-29 19:00:42.002','Completado','',237.6,49.9,287.5,'cli-004',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('e8aa93cd-bd35-448c-99d4-5146054c6b1a','PED-2025-036','2025-12-22 08:56:37.909','Completado','2 UDS SIDEMBLOCK M20',380.24,79.85,460.09,'939d4c8d-5f60-4d45-9b27-1635415d318c',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('ee9be00e-69ce-4900-b715-90c068fa862d','PED-2025-016','2025-12-09 08:35:39.611','Completado','',427.5,89.77,517.27,'84766839-76ed-484a-aa38-670f8b4701d5',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('f1cecc17-b8da-4bf1-ad4d-0d370d9f3374','PED-2025-002','2025-11-27 15:18:06.696','Completado','',949.8,199.46,1149.25,'c7472f46-7e69-452b-b53e-3a49788f78b5',NULL,'8ab0bcc3-bba5-4e2d-9e71-b805716a881f'),
('f5505b24-edc5-49b7-bf18-95956b709a36','PED-2026-068','2026-01-15 09:59:09.751','Borrador','pedido n 0260072\nPLAZO DE ENTREGA 19/02/2026',490.5,103,593.5,'d7d5aa31-c00a-44c6-9a6e-158c602af336',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('f96f1899-1d63-4747-b1e1-14bae1ff5454','PED-2026-052','2026-01-07 10:11:45.231','Completado','',3564,748.44,4312.44,'cli-001',NULL,'4adc6303-c8ed-48e1-a6da-535d90482a6e'),
('ff276fb9-3a4a-49b4-9533-86bd69d6f44c','PED-2025-046','2025-12-26 16:45:50.666','Completado','Y 3 MTS DE BORDE ONDULADO DE GOMA 80',370.48,77.8,448.28,'dd35e1d3-16b7-45fa-a566-341c5d56307c',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2'),
('ffb96803-2e36-44e7-a039-4d119756f86b','PED-2026-055','2026-01-08 10:24:18.509','Completado','',268.92,56.47,325.39,'d08b5107-11a9-40f3-abf8-9b666f397914',NULL,'56a3f64b-76be-4dd9-a508-6479a5f92db2');
/*!40000 ALTER TABLE `Pedido` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PedidoItem`
--

DROP TABLE IF EXISTS `PedidoItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `PedidoItem` (
  `id` varchar(191) NOT NULL,
  `descripcion` varchar(191) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unitPrice` double NOT NULL,
  `pesoUnitario` double NOT NULL,
  `pedidoId` varchar(191) NOT NULL,
  `productoId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `PedidoItem_pedidoId_fkey` (`pedidoId`),
  KEY `PedidoItem_productoId_fkey` (`productoId`),
  CONSTRAINT `PedidoItem_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PedidoItem_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PedidoItem`
--

LOCK TABLES `PedidoItem` WRITE;
/*!40000 ALTER TABLE `PedidoItem` DISABLE KEYS */;
INSERT INTO `PedidoItem` VALUES
('00faad76-772d-4c30-86b9-2c8aa13e6f4b','SOLANO EXTERIOR - GOMA - SOLANO HORIZONTES',6,8.88,4.25,'765f7b91-40f4-4be1-b94b-fee402204b46','51f95cb3-1440-4a65-9c94-a473a14551e5'),
('06b10e08-c10f-4e87-9515-9c9e20b087be','Patines - GOMA - Crispe ',100,2.85,1.36,'ee9be00e-69ce-4900-b715-90c068fa862d','44984e37-efbb-4e28-935b-845345ee6bcf'),
('071061e2-44a9-4cce-89bd-4838d637d2a6','600/4 - GOMA - BANDA CAUCHO',1,148.02,70.8,'f1cecc17-b8da-4bf1-ad4d-0d370d9f3374','d800bacf-69ab-4bc9-a5dc-381a07d6df52'),
('0822ff29-67c5-4769-ac3b-d1eca3e218fe','3180566020200013 6+2 - GOMA - Topavi',30,10.9,4.87,'f5505b24-edc5-49b7-bf18-95956b709a36','d376a3bf-2757-451b-a933-8f7e0ab4f2a0'),
('0abccda7-e660-481d-af9c-f86dd21bf7f9','500/4 - GOMA - BANDA CAUCHO',10,12.34,5.9,'d9187915-2467-43ed-b7d4-4e406d67c78a','5c5731d0-6601-487a-a527-50525a43dd7b'),
('0b6be4db-d4d0-440a-a0c4-0cc1ea1d3cb5','170 - PVC - Crispe ',20,0,0,'663d36fe-40f9-4164-b8e3-c8aedc0b3f54','7961d650-3034-445f-8a5e-57b4fd09c5a9'),
('0bbf0cbc-c926-409f-aba6-17acd2d6d6ff','600/4 14MM - GOMA - METRAJE CAUCHO',1,0.84,0.42,'579659a0-d7d4-4e96-a7ef-c974b0322615','1367c66e-4dc6-42d3-b179-0acb9d5804b1'),
('0c350eef-ca3a-4d73-829d-d019d004cdd0','4L ALDAMA - GOMA - Aldama',10,8.68,4.15,'11eaed65-7f88-4cb0-ab25-c90c134a1f05','f3481eda-0f98-404c-9dc1-67add278cb6b'),
('0ee8da1b-3aeb-4a7e-b434-dabb6f21ac14','F10 600 - FIELTRO - ROLLO FIELTRO',10,5.6,1.33,'3a989b70-c228-40ed-b745-8346aa274bb6','ae27f2a7-f5e8-434c-9fe1-2fbcf7a66a0f'),
('0fbad882-f491-47dc-86c1-d4753173ffae','N600 INTERIOR  - GOMA - Noli',7,13.62,6.51,'e8aa93cd-bd35-448c-99d4-5146054c6b1a','501333aa-df0a-4fa3-a3bb-c41096f92344'),
('109987b6-66bb-41fd-b785-fd351c0dff23','F15 ROLLO 600 - ROLLO FIELTRO - ROLLO FIELTRO',10,64.71,21.66,'911547a9-d073-49cc-b919-dbe6e070efb7','669bdc4e-f4cb-48c1-a981-1435a5f87b22'),
('1630b0bb-17e8-4bcd-9964-97f3269672e4','VARA MOTRIZ  - GOMA - Industrias Barraza',20,2.64,1.18,'54e182f3-9e37-4835-a12e-2b299e1bb2ae','99534f0d-b4bf-49b1-b3ef-2858d0320aba'),
('1734239a-843b-438e-9d43-ac6506203fe4','BAUTISTA SANTILLANA 14MM - GOMA - Bautista Santillana',4,15,7.41,'392fb756-17a1-418c-ac93-b785f998201e','78693b4e-72a0-48bb-83da-1ac11d645a17'),
('177643af-b84a-46f2-90d4-84e58a400cc4','FALDON M BOHORQUEZ - GOMA - MARTIN BOHORQUEZ',17,8.02,3.84,'9bc663cf-85b5-41f7-bf4a-32afea564f8d','7123f1dc-c1c8-4199-b720-d017f9cfa824'),
('183d7f7d-ed17-4c87-878e-e68919e94765','500/4 14mm - GOMA - METRAJE CAUCHO',15,19.23,9.5,'56ec79e7-2dd8-4aec-ab56-fa0bf0ebaa83','fa6eaee4-1b7c-44c6-8e6b-b150e0e64112'),
('184513ba-5e5b-4a97-8f2e-4bc7f3aa6a18','600/4 12MM - GOMA - METRAJE CAUCHO',14,19.8,8.85,'367b6c1c-5a73-4a03-a0cb-b29beecbeb3c','c042577c-c906-4f7b-a356-e3d00eb33edd'),
('1a4aa169-9ecd-4592-b198-83229d85877b','CA8-150 - CARAMELO - METRAJE CAUCHO',4,17.78,3.4,'cf0fd583-57c3-43b1-a4c5-245d996a7ff9','4588a2c0-d60e-4532-9be6-02041823ec56'),
('1c2ec17e-52f1-4fdb-8da9-a318cbf721a6','AGM0041 - PVC - Moresil',20,0,0,'599da2d1-bebc-4701-a186-a3d393dbdf9f','0293bb45-34e7-41e2-8ac3-27baff107479'),
('1ca810db-5d0c-4ea9-9e35-8a15c5a1d0e8','SABANAS - PVC - Crispe ',10,0,0,'663d36fe-40f9-4164-b8e3-c8aedc0b3f54','95eb5198-dff6-4e15-aa53-948fc3e5b98a'),
('1ea8c572-00bd-4b3d-9ba1-6b1dd2431cca','B SANTILLANA TROQUEL - GOMA - Bautista Santillana',2,9.33,4.46,'978781e7-825c-46ce-be5c-231dc8328b47','8f34570d-999c-4efd-b70a-5202b46ed707'),
('1f3ff6ce-6ab8-4a28-a9b2-513ab448d275','500/4 - GOMA - BANDA CAUCHO',10,12.34,5.9,'8f4975bb-dbaf-4c7c-a6a1-eefff5d088c2','5c5731d0-6601-487a-a527-50525a43dd7b'),
('1fa32346-c017-4a88-b0ff-0003a7b9e662','500/4 - GOMA - BANDA CAUCHO',1,123.35,59,'f1cecc17-b8da-4bf1-ad4d-0d370d9f3374','5c5731d0-6601-487a-a527-50525a43dd7b'),
('20e7e9e3-bc03-4684-83ab-4d8af0dce6b1','FB65 14MM - GOMA - PELLENC',15,16.15,7.98,'a578d609-2912-4221-92c6-617b635a11aa','55ed2254-afb8-4e36-9e25-f7d5215d9963'),
('253499ee-7aab-40c8-9430-d7d53aa83f07','6000891 - GOMA - Industrias Barraza',20,5.94,2.65,'91613b64-0c48-4e21-b454-230dd185c8c7','5ed754bc-04d5-443d-860d-4f47cb586e82'),
('2656dbb6-5a44-4a52-ac57-afd1f85b5c5e','TACO VIDELSUR DURO - TACO PINZA - VIDELSUR',2,0,0,'ffb96803-2e36-44e7-a039-4d119756f86b','8125c0f3-4267-4504-a23c-39e0a37c6e33'),
('27b40dc6-ee05-43cd-bbb1-f0529a4edd38','B3 CERRADA S/FIN - PVC - ARTUGAL',1,0,0,'c54d35cb-87cf-4950-ac89-1ed219c86aa5','ad54d25a-9cc1-4935-937c-7ece6fc055da'),
('2ac2487c-234b-4301-a94e-7a76d2f842ba','4L ALDAMA - GOMA - Aldama',50,8.68,4.15,'d3f2e1c7-5ae4-4f61-b426-7569ba833a7c','f3481eda-0f98-404c-9dc1-67add278cb6b'),
('2b0be952-8301-49e2-bf40-44167a07e7e8','F10 600 - FIELTRO - ROLLO FIELTRO',150,5.6,1.33,'435b3aec-3892-42da-a805-8bc30dafbadd','ae27f2a7-f5e8-434c-9fe1-2fbcf7a66a0f'),
('2c237456-fa1e-494b-89c4-be1ecf156393','CM6.16 6+2 - GOMA - Industrias Barraza',30,11.63,5.2,'35add1e3-1cc6-435c-b48f-fdfcf7ee50fb','0a1d9a93-d8f2-4abe-924c-9f52c1b97754'),
('2f4857e1-659e-48da-9632-bd86de40aae0','MARTIN BOHORUQEZ F15 SALAGRI - FIELTRO - FIELTRO',1,5.14,1.34,'5a94a2c3-ee30-478e-953b-67e90abb1923','bb01f815-153f-4a7f-b893-05d59e69052b'),
('2ffe10b1-bf1b-4ca0-bf16-30c73d46c686','500/4 - GOMA - BANDA CAUCHO',10,12.34,5.9,'911547a9-d073-49cc-b919-dbe6e070efb7','5c5731d0-6601-487a-a527-50525a43dd7b'),
('32d53853-4082-49b9-ac8a-a65f469e097b','TOLVA CASTILLERO - PVC - CASTILLERO INFANTE',2,0,0,'04e65ed1-b4d6-4f63-8285-080bd1c06f68','11c3f6e4-5cb2-402f-8524-3fc2d2df61d9'),
('36e58c9b-b139-41cd-a7ce-368f859145f9','MARTIN BOHORUQEZ 700 - GOMA - MARTIN BOHORQUEZ',16,8.63,4.13,'9bc663cf-85b5-41f7-bf4a-32afea564f8d','657365d5-0f58-4ae6-a0d5-f3dc780ef651'),
('383d7467-21b4-4c17-9cd8-6b5bea995a2d','CIERRE TRONCO VIEJO - GOMA - MARTIN BOHORQUEZ',7,14.8,7.08,'9bc663cf-85b5-41f7-bf4a-32afea564f8d','2a3bd366-b59c-4f2a-9264-2d3000e989af'),
('38789ce9-704f-4371-9681-b4b76a1c87a7','ANTIPOLVO TRITURADORAS PMA-2.0 / PMA-2.0FREATT (TRITOD) - GOMA - PROMAGRI',51,10.3,4.6,'53e8829c-4da6-47ad-8064-fb55ec224d4e','01a18130-2e99-42ce-93af-21a576a65135'),
('397f1f6b-b3ee-45d6-bf0f-0d611d25c238','MAI600 14 - GOMA - MAI',10,15,7.41,'41794bf7-80c2-4cad-b015-116ead721249','64cc7c28-cb14-42d7-8f22-26e5944f314a'),
('3b817e75-4b7e-4b8f-9f29-a2cfe6b8a9e1','BAUTISTA SANTILLANA 14MM - GOMA - Bautista Santillana',30,15,7.41,'9f6812d7-f7f2-4975-8dad-ae2736281bc1','78693b4e-72a0-48bb-83da-1ac11d645a17'),
('3be17a33-8e7b-4045-9302-8bdbe05efaef','400/4 - GOMA - BANDA CAUCHO',4,9.87,4.72,'49fcd227-15cc-46d9-8ff8-64bd11e71f74','09f3b7a0-e116-44df-b063-643ba8006288'),
('3cb6884d-b9db-4407-a442-594d8e37e559','550/460 X 1200 - GOMA - METRAJE CAUCHO',2,16.28,7.79,'7491a6c7-ccd2-4159-a6aa-f06ebcbca414','306121ad-2cf4-4201-8916-d15777e731a1'),
('3e09d1df-9ce1-4f73-94cf-4f252f15be67','Picador  - GOMA - Moresil',3,140.16,67.28,'614cc2fb-798e-4504-8832-66abb7800eb6','f5333f16-f1ff-4e5e-b500-4f3fdc2f05d6'),
('3f591a2f-e9b2-454a-a6cc-3ae90d6fa0ad','VIBROMART 250X610 - GOMA - Vibromart',50,2.83,1.36,'5dc19932-ed03-4aab-85c9-129bff41ca46','d6259f72-5856-48d4-b2fa-094647519e75'),
('3f6d6660-8150-4cd8-9cd2-22520b3b6947','500/4 - GOMA - BANDA CAUCHO',6,12.34,5.9,'9bc663cf-85b5-41f7-bf4a-32afea564f8d','5c5731d0-6601-487a-a527-50525a43dd7b'),
('464cbde1-5a66-4b8d-948b-05a11f6aa395','PMBC DERECHAS - GOMA - Industrias Barraza',10,18.5,8.85,'91613b64-0c48-4e21-b454-230dd185c8c7','b0d1f77b-698e-4740-a8c0-1446ec28ad1d'),
('46b8217f-5c9d-4abe-9d1c-9dd6a138a679','MAI600 F15 - FIELTRO - MAI',20,5.83,1.52,'b90f51c7-6e49-4246-89b0-8cde4da7b6ae','ae1f4ca4-dd86-4e81-9c62-98bf1b6130f1'),
('46c0a819-4ef3-4018-a07b-33f29d2dc839','CB80 14 - GOMA - PELLENC',10,11.54,5.7,'d292dd91-374e-4bd6-8fbf-1daedc46712a','e4ed1c7d-be23-43ea-a1d9-139c7babd250'),
('4860774c-d1eb-45f3-89d8-7d441aaba844','PMC B NEUVO DCH - GOMA - Industrias Barraza',5,24.75,11.06,'54e182f3-9e37-4835-a12e-2b299e1bb2ae','1a9fc297-4c7c-441f-b3a6-8f3eeac89421'),
('4dac710e-e4ee-4fb4-b651-488562d54176','TRITURADO PMA-2.0FREAT - PMA-2.0(INFERIOR) - GOMA - PROMAGRI',50,7.9,3.77,'53e8829c-4da6-47ad-8064-fb55ec224d4e','24dfdaa9-0528-49e5-b65f-41a41b5f3b3d'),
('4f044707-b8b2-4b67-8f9d-ec8377f715e2','F15 550 - FIELTRO - FIELTRO',1,76.4,19.86,'0be30572-579e-4d32-8be1-e0ce678e5ff5','f032067a-6e69-4748-9fbe-e38c6929ca56'),
('4f3e3ebb-a1aa-4353-b53c-0616f637fb47','PARAGUAS ALDAMA  - GOMA - Aldama',100,23.76,10.62,'f96f1899-1d63-4747-b1e1-14bae1ff5454','f2fe4ed2-13ae-4673-826d-a18dc9e46cd3'),
('509cb7f9-07c2-4d7b-bfff-2d8a45319154','CB80 14 - GOMA - PELLENC',35,11.54,5.7,'9f6812d7-f7f2-4975-8dad-ae2736281bc1','e4ed1c7d-be23-43ea-a1d9-139c7babd250'),
('527e995b-bd54-4111-836d-22c77b45f823','PVC SOLERA - PVC - PVC',1,0,0,'46c73ded-bb7a-4a96-b8ab-04ee5460ec68','04e5e8ba-7ccb-4603-8b2a-9b1f9b0bd148'),
('52932c98-8944-49d6-858b-46bf40315b92','60008A06 - GOMA - Industrias Barraza',20,1.74,0.83,'91613b64-0c48-4e21-b454-230dd185c8c7','7edefa2f-3eb0-404d-820e-6e37f1cffe38'),
('530b8b7f-feff-402e-8242-3a207a3089f3','DVT2025B - FIELTRO - Moresil',20,2.31,0.55,'bcf3e11b-bff0-4c7b-b132-4fe45ff4118a','d4342793-dc04-414d-a04c-29704b2dfe16'),
('55916805-4e67-47d2-b6e2-5d28ac4ea12f','500/4 - GOMA - BANDA CAUCHO',15,12.34,5.9,'56ec79e7-2dd8-4aec-ab56-fa0bf0ebaa83','5c5731d0-6601-487a-a527-50525a43dd7b'),
('568f19d3-ef67-46c6-b022-045dbabf1377','MT500 4+2 - GOMA - Industrias Barraza',20,7.03,3.36,'91613b64-0c48-4e21-b454-230dd185c8c7','a869fe26-fc34-498b-a509-195b3e6591cf'),
('58e73ca7-7f30-4c10-b295-c8427b698c02','600/4 - GOMA - BANDA CAUCHO',10,14.8,7.08,'392fb756-17a1-418c-ac93-b785f998201e','d800bacf-69ab-4bc9-a5dc-381a07d6df52'),
('5957d1b9-dff9-429e-95a2-7d3188ab6b4d','CM6.16 6+2 - GOMA - Industrias Barraza',10,11.63,5.2,'54e182f3-9e37-4835-a12e-2b299e1bb2ae','0a1d9a93-d8f2-4abe-924c-9f52c1b97754'),
('5a274c0f-e169-4231-8361-a41b0019e435','ESTRELLA AGROISA - VERDE - METRAJE CAUCHO',100,2.17,0.62,'3e0eac31-c9e1-4900-b5e7-d1f9beb4ccb0','2b7411dc-2768-41bd-a09a-eb9c48adc483'),
('5da32ffc-5535-41ac-aa7d-1600dd59a684','BAUTISTA SANTILLANA 14MM - GOMA - Bautista Santillana',4,15,7.41,'370c0a65-a2f3-4110-add0-c3405271b995','78693b4e-72a0-48bb-83da-1ac11d645a17'),
('600a040c-33e8-40f9-8e42-948af30138e1','BORDE ONDULADO 80MM - BORDE ONDULADO 80MM - METRAJE CAUCHO',20,0,0,'61abe5dd-656a-4342-9d79-3bdc346aa070','333ddf2b-a8f5-40ef-946c-b60a85f078e4'),
('62b4d003-d7d3-451b-9b89-4ee95b81e976','600/4 - GOMA - BANDA CAUCHO',20,14.8,7.08,'63277d04-a5ad-4056-a565-1a8269b5d7c7','d800bacf-69ab-4bc9-a5dc-381a07d6df52'),
('63b5b118-9ec3-4921-b342-e6d7f40e7607','F10 600 - FIELTRO - ROLLO FIELTRO',150,5.6,1.33,'6c508912-3b94-4585-83ec-5244c155bb26','ae27f2a7-f5e8-434c-9fe1-2fbcf7a66a0f'),
('66d45538-aedc-4a7c-bc2d-1191df797a49','F15 400X650 - FIELTRO - FIELTRO',4,3.61,0.94,'7491a6c7-ccd2-4159-a6aa-f06ebcbca414','9a5f6400-7b7c-481a-bf96-4e5e7ef6a111'),
('67c1c8a4-4aa8-4d76-afa2-08490e9c071a','VIDELSUR 10X500X710 - GOMA - VIDELSUR',6,8.76,4.19,'ffb96803-2e36-44e7-a039-4d119756f86b','270eb5c0-ab23-45f2-b9dc-af6cf2a0840c'),
('6ad9715e-a6b2-49fa-a8af-dbbb6749fdb1','Boca paraguas - GOMA - Vibromart',50,11.61,5.57,'b094b996-4a31-4733-9256-931db16ea967','e435a9d2-3148-4aa3-a069-aa1158754a13'),
('6fbfdc91-0990-4d3b-b812-11c1dbbfa324','MT500 6+2 - GOMA - Industrias Barraza',20,9.4,4.2,'91613b64-0c48-4e21-b454-230dd185c8c7','9acaa308-7178-4f8d-800b-1eaa6b84bd97'),
('7056c21e-f7bc-4636-83c4-0804a4c261dc','CIERRE TRONCO NUEVO - GOMA - MARTIN BOHORQUEZ',9,11.12,5.34,'5f04e81e-42b2-4676-b4ea-4d80ffd91761','c4bf82c4-1a18-4ee5-bd51-3c3d15647961'),
('71d597b3-8cb7-40a1-99a9-1c7511de1043','170X390 - PVC - Crispe ',20,0,0,'663d36fe-40f9-4164-b8e3-c8aedc0b3f54','3f597367-3bcf-48cf-91b0-086f056bb62c'),
('722b6318-f1aa-48d9-9508-7aaa3ed543cb','VIBROMART GOMA - GOMA - Vibromart',7,7.4,3.54,'411ff7da-feeb-4f20-b44b-a1c20bafa9cc','6977415a-a89c-4cc5-bc44-a0851ae37ad7'),
('743e2882-d4c4-452c-a050-b690c2042ddd','N600 EXTERIOR - GOMA - Noli',16,17.42,8.61,'8c551612-bbb7-4427-b93e-80789bd4f1d8','8cf856be-2799-4139-a401-51e20b8dc89d'),
('7477860c-83df-415c-beda-fd7ca8961983','0600862B - GOMA - Industrias Barraza',20,0.6,0.29,'35add1e3-1cc6-435c-b48f-fdfcf7ee50fb','bc044a74-0e0c-4313-a559-6b71c13070e1'),
('79938fa1-1345-4228-9f6f-6e665b5a2b33','500/4 - GOMA - BANDA CAUCHO',4,123.35,59,'49fcd227-15cc-46d9-8ff8-64bd11e71f74','5c5731d0-6601-487a-a527-50525a43dd7b'),
('7ad5216e-91a1-47ae-938f-4fd59661a4e7','CIERRE TRONCO MAI500 4+2 - GOMA - MAI',2,17.64,8.44,'54e182f3-9e37-4835-a12e-2b299e1bb2ae','a825499f-3ecd-461f-bd53-7174bb40612f'),
('7badc6b3-7188-4778-a50a-788264d0f0d8','Boca paraguas - GOMA - Vibromart',50,11.61,5.57,'5dc19932-ed03-4aab-85c9-129bff41ca46','e435a9d2-3148-4aa3-a069-aa1158754a13'),
('7c1e5605-9e1a-482b-b6e5-15b719ce5f5f','PMBC IZQUIERDAS - GOMA - Industrias Barraza',10,18.5,8.85,'91613b64-0c48-4e21-b454-230dd185c8c7','54a3d6ff-c11b-439d-b50d-7ec103a8db69'),
('7d4f99eb-765f-4591-973a-405bf84b4e73','Boca paraguas - GOMA - Vibromart',50,11.61,5.57,'e0e0b152-be27-4f7f-ae27-bc114c7ddf98','e435a9d2-3148-4aa3-a069-aa1158754a13'),
('8083799b-bd04-48c7-8440-391706f8d752','10456413 - GOMA - Halcon',60,9.47,4.53,'280c8dce-dde7-41cd-b794-e0e7ea07e0a2','360da019-b024-4bb4-be4f-8a672178c89c'),
('80c69abb-1a8a-43ab-b4c0-e138e62cb168','CB15 GOMA10 - GOMA - METRAJE CAUCHO',8,5.92,2.83,'be972e6b-9fc6-4240-8a03-e3bb47ceb512','91f2297a-6049-4c60-b3e7-b6504c9c1643'),
('81626ce3-be3b-4dc3-9c2d-62e17bb32988','AGM0055 - PVC - Moresil',20,0,0,'599da2d1-bebc-4701-a186-a3d393dbdf9f','736f08f3-5cff-4b5a-90c0-4a32a022fe6d'),
('8369bf0e-2ee8-454e-91f1-21397ead87b4','800/4 4+2 - GOMA - METRAJE CAUCHO',2,26.64,12.74,'1f69dfad-6866-4104-84f0-52b6ab505171','d0040462-3184-40cc-a5f0-7ca989689f38'),
('887776d2-c1c5-4e1f-a02e-f48c61ee1095','Patines - GOMA - Crispe ',50,2.85,1.36,'663d36fe-40f9-4164-b8e3-c8aedc0b3f54','44984e37-efbb-4e28-935b-845345ee6bcf'),
('88984744-642f-4cb3-b016-bd0c5a70be6e','CIERRE TRONCO C/MUECA - GOMA - MARTIN BOHORQUEZ',4,14.8,7.08,'5f04e81e-42b2-4676-b4ea-4d80ffd91761','2a3bd366-b59c-4f2a-9264-2d3000e989af'),
('8d529f85-12b7-406c-88ab-1dbe5ee28be3','VIDELSUR 14X500X680 - GOMA - VIDELSUR',6,13.65,6.74,'ffb96803-2e36-44e7-a039-4d119756f86b','16af8d16-13d5-4e55-a692-2a4e98d3f555'),
('902ad190-4617-4f3e-b299-22ccec525792','AGM0049 - GOMA - Moresil',60,2.64,1.26,'e7e039f3-f0cd-4a73-9895-8c5bde6d9a4f','f2412be2-8f55-41dc-a8eb-22dacb00526c'),
('92904216-4a50-4e3e-82ab-2f138ddbd809','F15 ALDAMA - FIELTRO - Aldama',6,5.19,1.35,'11eaed65-7f88-4cb0-ab25-c90c134a1f05','75339e65-2890-4a6c-84c1-02a00376ef41'),
('92a787e2-a8cb-4752-81b7-e8eb8e0affd9','170 - PVC - Crispe ',40,0,0,'704e0ad3-19cd-4b3f-908e-124298c4ca5f','7961d650-3034-445f-8a5e-57b4fd09c5a9'),
('930838a7-e9aa-4441-9076-3c20d208b2a0','GOMA 10 JR - GOMA - METRAJE CAUCHO',4,8.82,4.22,'73cc36bf-9cbe-4618-8ed1-54789f4aba6a','17cc4176-96e4-4609-aeff-93a9d5b26301'),
('95db3a1b-d13f-4652-979d-a01bcde69e46','N600 EXTERIOR - GOMA - Noli',7,17.42,8.61,'e8aa93cd-bd35-448c-99d4-5146054c6b1a','8cf856be-2799-4139-a401-51e20b8dc89d'),
('972914b9-e589-4d8b-91aa-fff86f00c5d0','600/4 - GOMA - BANDA CAUCHO',16,14.8,7.08,'3a989b70-c228-40ed-b745-8346aa274bb6','d800bacf-69ab-4bc9-a5dc-381a07d6df52'),
('9823f491-906d-4b71-a2b3-fbd784fbff50','N500 F15 SALAGRI - FIELTRO - Noli',20,5.69,1.48,'5a94a2c3-ee30-478e-953b-67e90abb1923','de61d466-fea4-4be3-a327-c9fa5ab4a720'),
('9850fabe-bbe3-4f57-861a-bd4bd332ba08','800/3 - GOMA - METRAJE CAUCHO',1,17.8,8.54,'0badc652-8024-45b7-8408-5d8db3fe9aa5','c6260af9-7e2f-4d17-9043-5b5979708f3b'),
('9a022841-bed1-4d32-9208-cace9a52a168','',1,0,0,'ff276fb9-3a4a-49b4-9533-86bd69d6f44c',NULL),
('9d779238-ff22-4ae1-a721-1c5c73942eef','FALDON M BOHORQUEZ - GOMA - MARTIN BOHORQUEZ',8,8.02,3.84,'5f04e81e-42b2-4676-b4ea-4d80ffd91761','7123f1dc-c1c8-4199-b720-d017f9cfa824'),
('a1ce5cc5-37ce-431a-924e-68b4c2da5dc2','0630000030 - GOMA - Halcon',50,7.89,3.78,'e345a881-c97a-4b6f-964b-d45d188f3374','cde94fd6-d4fd-4f90-bd0b-f2dd9fa6076f'),
('a434f65b-d234-48d5-9a62-9ee5d009804b','F15 JR - FIELTRO - FIELTRO',4,5.35,1.39,'73cc36bf-9cbe-4618-8ed1-54789f4aba6a','7aece25c-85b4-47a8-9a46-ab21a0601da0'),
('a4f6e2c5-ef38-49aa-aaff-a9c3314d036c','0600863B - GOMA - Industrias Barraza',20,1.07,0.51,'35add1e3-1cc6-435c-b48f-fdfcf7ee50fb','43abc119-0698-451f-b210-340b13416111'),
('a9851eff-3b29-49a2-ae8d-b9ac55c47b28','CIERRE TRONCO BAUTISTA 800 - GOMA - Bautista Santillana',2,25.66,12.27,'370c0a65-a2f3-4110-add0-c3405271b995','da8fc860-1ff8-4bff-865a-99bf818426da'),
('ace275a5-11b8-4b17-8e0f-bff960050cd1','500/4 - GOMA - BANDA CAUCHO',1,123.35,59,'f1cecc17-b8da-4bf1-ad4d-0d370d9f3374','dd8deb78-eef2-4bb0-8808-cf1ffeb74747'),
('acf1771a-3c05-4456-9249-0ed511a3bfe5','TOLVA ARTUGAL - PVC - ARTUGAL',1,0,0,'04e65ed1-b4d6-4f63-8285-080bd1c06f68','cb12f6f3-4024-467e-93f4-7a60d063a9ab'),
('ad1b353b-dfb2-428e-8e77-6476ed85fddc','MAI600 14 EXTERIOR - GOMA - MAI',6,16.15,7.98,'41794bf7-80c2-4cad-b015-116ead721249','fbe34467-303d-4d8c-9e8c-543af020e824'),
('ad38db39-0f63-40dd-b2fa-5d230a24f81c','02963 CA12 - CARAMELO - TALLERES MATA CAMPOS',20,25.75,5.32,'97e6fd1a-d303-42e1-9417-bad3c2439bed','4de1dc3a-4525-49b4-b227-9ea7955ad81b'),
('adb7d8c4-63b2-46d5-b14c-cb7f37d51ade','ARCUSIN 10MM - GOMA - ARCUSIN',2,6.91,3.3,'c52aa0b7-7253-4b85-a643-9ea3cbc99958','4effc202-1801-4694-85dd-d74984630f7f'),
('af0cf585-d38c-492a-ae8a-5a2667ae320a','02962 CA12 - CARAMELO - TALLERES MATA CAMPOS',10,25.75,5.32,'97e6fd1a-d303-42e1-9417-bad3c2439bed','45397924-261b-456b-b078-e7e050cb8141'),
('b0faf579-fcf1-44f6-bc9d-bb924872d0f9','Boca paraguas - GOMA - Vibromart',50,11.61,5.57,'3493b3bb-ea7d-4d3e-abab-976335dceb69','e435a9d2-3148-4aa3-a069-aa1158754a13'),
('b1c8bd9f-ad65-4b0d-8814-0638971b1554','Patines - GOMA - Crispe ',100,2.85,1.36,'550cba60-d247-46d3-a6aa-f792833b6c27','44984e37-efbb-4e28-935b-845345ee6bcf'),
('b3b47c33-5468-49e8-aa4e-4d216498ccd9','PMC B NUEVO IZQ - GOMA - Industrias Barraza',5,18.5,8.85,'54e182f3-9e37-4835-a12e-2b299e1bb2ae','fbf5f578-bb8b-409d-ae5a-60705cc53a9b'),
('b4a9f748-680f-46ab-b5df-d6c8e1c2b529','BAUTISTA SANTILLANA F15 - FIELTRO - Bautista Santillana',2,5.42,1.41,'7c6ffa5f-6c6d-49d0-9594-f09a6b2bfd36','5d0921fd-193f-4359-b740-f87d38b3c2f0'),
('b5cf673f-8474-49f0-8119-cdf7a477a6c0','PA8-2 - GOMA - Noli',25,23.08,11.4,'1f3fc730-f81e-4c6a-9de0-3a280be550a0','0c6347f7-2a2c-481b-809d-2a38970bad90'),
('b71e9a08-548d-4f28-a992-455c8d9f0254','F15 TIJERA  - FIELTRO - Topavi',6,3.82,0.99,'4c8300d7-a04c-4621-b8ef-ce0847cb09ef','d64ca463-aac0-47b7-81ee-916f5631281c'),
('b8d8e0c1-fbdc-47a3-9716-3b12dce7164d','02962 CA12 - CARAMELO - TALLERES MATA CAMPOS',1,25.75,5.32,'326f5570-d18f-4171-bc9b-84d6656bfd55','45397924-261b-456b-b078-e7e050cb8141'),
('bb4d74ca-f8dd-46dd-b146-310d215f50b6','600/3 - GOMA - METRAJE CAUCHO',10,11.12,5.34,'ff276fb9-3a4a-49b4-9533-86bd69d6f44c','cf0b076d-0b84-453a-86e9-317d4502f56a'),
('bd19b14f-8634-45ef-bbd7-3b1a2f36c515','N600 F15 - FIELTRO - Noli',6,6.67,1.73,'b90f51c7-6e49-4246-89b0-8cde4da7b6ae','93642467-0170-471f-8dc7-f6e6a55535ff'),
('bed9c143-8a9d-411e-834a-7bb395d9b6d7','',1,0,0,'e8aa93cd-bd35-448c-99d4-5146054c6b1a',NULL),
('c039bc87-bfcc-4da8-a1d4-fd2fd8fad9b0','600/4 - GOMA - BANDA CAUCHO',1,148.02,70.8,'f1cecc17-b8da-4bf1-ad4d-0d370d9f3374','d800bacf-69ab-4bc9-a5dc-381a07d6df52'),
('c0e1239c-a228-4683-acd1-104cba5b882c','12356412 - GOMA - Halcon',50,10.07,4.81,'e345a881-c97a-4b6f-964b-d45d188f3374','a65b379b-54e8-439d-a411-a7b5b6e9868b'),
('c20fc9d8-0ccd-4203-936e-502875046d32','F15 ROLLO 1800 - ROLLO FIELTRO - ROLLO FIELTRO',1,194.13,64.98,'51f2be32-3034-4a34-bed7-5e5b429ac7c0','24d2c532-0ce2-4261-9db7-fb90d853b33c'),
('c67b3d85-0ad1-46fd-966c-c9147c618fae','VIDELSUR 10X500X710 - GOMA - VIDELSUR',4,8.76,4.19,'d7e793d5-7711-4993-8f1a-0e64509f7cea','270eb5c0-ab23-45f2-b9dc-af6cf2a0840c'),
('c7fbd03a-c08a-4c79-a649-f9bc066575b1','BAUTISTA SANTILLANA 10MM - GOMA - Bautista Santillana',2,9.33,4.46,'7c6ffa5f-6c6d-49d0-9594-f09a6b2bfd36','b966ce3f-ef00-4549-9cff-5bced2271c89'),
('c92f2877-07a9-4e06-b3a1-b8618e39fd59','F15 MAI500 - FIELTRO - FIELTRO',2,5.35,1.39,'73cc36bf-9cbe-4618-8ed1-54789f4aba6a','c648a549-d873-441a-a7cd-fc7f236f97e5'),
('c95e77be-ea0e-4b87-8746-5d8e3eb3da41','500/4 - GOMA - BANDA CAUCHO',20,12.34,5.9,'392fb756-17a1-418c-ac93-b785f998201e','5c5731d0-6601-487a-a527-50525a43dd7b'),
('c98c982d-390b-41ce-90f7-976c43d39ec1','500/4 - GOMA - BANDA CAUCHO',10,12.34,5.9,'9bc663cf-85b5-41f7-bf4a-32afea564f8d','5c5731d0-6601-487a-a527-50525a43dd7b'),
('c9abd3e6-66b6-41a7-b1b9-3766b256c57a','VIBROART F15 - FIELTRO - Vibromart',4,4.51,1.17,'411ff7da-feeb-4f20-b44b-a1c20bafa9cc','97501937-d391-4d2c-83a5-327a65b8a662'),
('c9b16509-b1b5-4a4d-8b00-f82a9f19b6fe','PA8-2 - GOMA - Noli',2,23.08,11.4,'01e293df-7dfb-4acf-a7f8-e3bd27c41db5','0c6347f7-2a2c-481b-809d-2a38970bad90'),
('cc8ee85b-6b50-4edc-ac87-9a77565ce0c7','CIERRE TRONCO BAUTISTA 800 - GOMA - Bautista Santillana',2,25.66,12.27,'7c6ffa5f-6c6d-49d0-9594-f09a6b2bfd36','da8fc860-1ff8-4bff-865a-99bf818426da'),
('d102b7d1-7771-4fd5-a5a1-e92cd8d6ee36','F15 ROLLO 600 - ROLLO FIELTRO - ROLLO FIELTRO',10,64.71,21.66,'2d91d939-6880-4733-965f-2907645f2682','669bdc4e-f4cb-48c1-a981-1435a5f87b22'),
('d1bba775-f130-4c26-8110-6915302b4b6e','AGM0043 OREJILLA TOLVA  - PVC - Moresil',20,0,0,'0e1a00cd-a302-4f0c-8f01-f12a92ee8085','46d50f03-9394-4c22-bdbe-f8ada203a632'),
('d6834490-ef17-46e3-b164-6e4352fb5dce','500/4 - GOMA - BANDA CAUCHO',6,12.34,5.9,'ff276fb9-3a4a-49b4-9533-86bd69d6f44c','5c5731d0-6601-487a-a527-50525a43dd7b'),
('d6fa0a44-62b6-4773-adfb-b152477b49b7','800/4 4+2 - GOMA - METRAJE CAUCHO',6,26.64,12.74,'367b6c1c-5a73-4a03-a0cb-b29beecbeb3c','d0040462-3184-40cc-a5f0-7ca989689f38'),
('d9e1f5bb-72cc-452b-8016-ac7f5aacc55c','VIDELSUR 14X500X680 - GOMA - VIDELSUR',4,13.65,6.74,'d7e793d5-7711-4993-8f1a-0e64509f7cea','16af8d16-13d5-4e55-a692-2a4e98d3f555'),
('da642636-c5fb-4707-8fac-df805c71de8f','BAUTISTA SANTILLANA 14MM - GOMA - Bautista Santillana',6,15,7.41,'7c6ffa5f-6c6d-49d0-9594-f09a6b2bfd36','78693b4e-72a0-48bb-83da-1ac11d645a17'),
('df0ded00-5600-41cf-9229-6382dae8d6a7','BRAZO TENAZAS 4+2 - GOMA - Industrias Barraza',6,3.89,1.86,'91613b64-0c48-4e21-b454-230dd185c8c7','a26e57d7-d8ef-4f54-b97e-94dbce726d3f'),
('e5499d3d-c910-4cb4-9d11-9739df8ddc52','FB65 14MM - GOMA - PELLENC',10,16.15,7.98,'911547a9-d073-49cc-b919-dbe6e070efb7','55ed2254-afb8-4e36-9e25-f7d5215d9963'),
('e7983ed6-d3b3-40fa-a38b-0610d28e9942','10456413 - GOMA - Halcon',50,9.47,4.53,'e345a881-c97a-4b6f-964b-d45d188f3374','360da019-b024-4bb4-be4f-8a672178c89c'),
('ec76235b-ca4e-4ea1-8896-4059118ff4f5','F10 600 - FIELTRO - ROLLO FIELTRO',10,5.6,1.33,'911547a9-d073-49cc-b919-dbe6e070efb7','ae27f2a7-f5e8-434c-9fe1-2fbcf7a66a0f'),
('edacc630-9738-43ff-82a7-4db0064b8187','FALDON M BOHORQUEZ - GOMA - MARTIN BOHORQUEZ',2,8.02,3.84,'18394451-bf05-4f47-a07b-76428be0e32b','7123f1dc-c1c8-4199-b720-d017f9cfa824'),
('ede1796b-fb7c-4bc3-bd80-681005c08e1c','550/4 - GOMA - BANDA CAUCHO',10,13.57,6.49,'780048af-fcd2-4ef5-a60e-c29563c5dbcf','4efaf8a7-6f34-4b1f-aa4d-09c69ade633e'),
('f28a42ee-f7d3-4ca2-b0d2-0cb44c09ca48','CIERRE TRONCO C/MUECA - GOMA - MARTIN BOHORQUEZ',6,14.8,7.08,'5e75845c-1429-4219-900e-e298542795b1','2a3bd366-b59c-4f2a-9264-2d3000e989af'),
('f2d394c8-ba99-4168-91ab-1e57dcf25ce8','CIERRE TRONCO NUEVO - GOMA - MARTIN BOHORQUEZ',6,11.12,5.34,'5e75845c-1429-4219-900e-e298542795b1','c4bf82c4-1a18-4ee5-bd51-3c3d15647961'),
('f33846aa-187f-4a49-8a52-42ac8ec1cae6','500/4 - GOMA - BANDA CAUCHO',20,12.34,5.9,'39a58a89-64cf-4c3f-a48f-0aeef8fada71','5c5731d0-6601-487a-a527-50525a43dd7b'),
('f4983de5-c244-4ca3-a208-e7f6655e9664','170 - PVC - Crispe ',20,0,0,'550cba60-d247-46d3-a6aa-f792833b6c27','7961d650-3034-445f-8a5e-57b4fd09c5a9'),
('f6bee855-c2d3-4dfc-9c32-5f9ecae5b06c','F15 500MM - FIELTRO - FIELTRO',6,0.07,0.02,'9bc663cf-85b5-41f7-bf4a-32afea564f8d','effb2376-7cd7-41c8-9c53-22ff97bbbe52'),
('fa03bf05-a582-4da7-b7ac-de373d2de5bc','BAUTISTA SANTIULLA TRAPEZOIDAL TROQUEL - GOMA - Bautista Santillana',14,0,0,'952137c1-962b-4c51-b195-26f7fcbd5257','60e871aa-aed6-415f-b92a-6b3c08066698'),
('fc2337f1-4a44-445a-ac41-561e269b80d3','CIERRE TRONCO NUEVO - GOMA - MARTIN BOHORQUEZ',8,11.12,5.34,'9bc663cf-85b5-41f7-bf4a-32afea564f8d','c4bf82c4-1a18-4ee5-bd51-3c3d15647961'),
('fe687c07-664c-4141-aebe-866809bb7209','ALDAMA 14 - GOMA - Aldama',20,13.54,6.69,'e49743c4-ae0d-4867-bfc8-9eba584308c0','d1a81780-2c6f-410f-8260-75f788b5971f');
/*!40000 ALTER TABLE `PedidoItem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PedidoProveedor`
--

DROP TABLE IF EXISTS `PedidoProveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `PedidoProveedor` (
  `id` varchar(191) NOT NULL,
  `material` varchar(191) NOT NULL,
  `fecha` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `estado` varchar(191) NOT NULL,
  `tipo` varchar(191) NOT NULL,
  `notas` varchar(191) DEFAULT NULL,
  `numeroContenedor` varchar(191) DEFAULT NULL,
  `numeroFactura` varchar(191) DEFAULT NULL,
  `naviera` varchar(191) DEFAULT NULL,
  `fechaLlegadaEstimada` datetime(3) DEFAULT NULL,
  `tasaCambio` double DEFAULT 1,
  `gastosTotales` double DEFAULT 0,
  `proveedorId` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `PedidoProveedor_proveedorId_fkey` (`proveedorId`),
  CONSTRAINT `PedidoProveedor_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PedidoProveedor`
--

LOCK TABLES `PedidoProveedor` WRITE;
/*!40000 ALTER TABLE `PedidoProveedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `PedidoProveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PrecioEspecial`
--

DROP TABLE IF EXISTS `PrecioEspecial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `PrecioEspecial` (
  `id` varchar(191) NOT NULL,
  `descripcion` varchar(191) NOT NULL,
  `precio` double NOT NULL,
  `clienteId` varchar(191) NOT NULL,
  `productoId` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PrecioEspecial_clienteId_productoId_key` (`clienteId`,`productoId`),
  KEY `PrecioEspecial_productoId_fkey` (`productoId`),
  CONSTRAINT `PrecioEspecial_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PrecioEspecial_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PrecioEspecial`
--

LOCK TABLES `PrecioEspecial` WRITE;
/*!40000 ALTER TABLE `PrecioEspecial` DISABLE KEYS */;
/*!40000 ALTER TABLE `PrecioEspecial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Presupuesto`
--

DROP TABLE IF EXISTS `Presupuesto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Presupuesto` (
  `id` varchar(191) NOT NULL,
  `numero` varchar(191) NOT NULL,
  `fechaCreacion` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `estado` varchar(191) NOT NULL,
  `notas` varchar(191) DEFAULT NULL,
  `subtotal` double NOT NULL,
  `tax` double NOT NULL,
  `total` double NOT NULL,
  `clienteId` varchar(191) DEFAULT NULL,
  `marginId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Presupuesto_numero_key` (`numero`),
  KEY `Presupuesto_clienteId_fkey` (`clienteId`),
  CONSTRAINT `Presupuesto_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Presupuesto`
--

LOCK TABLES `Presupuesto` WRITE;
/*!40000 ALTER TABLE `Presupuesto` DISABLE KEYS */;
/*!40000 ALTER TABLE `Presupuesto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PresupuestoItem`
--

DROP TABLE IF EXISTS `PresupuestoItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `PresupuestoItem` (
  `id` varchar(191) NOT NULL,
  `descripcion` varchar(191) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unitPrice` double NOT NULL,
  `pesoUnitario` double NOT NULL DEFAULT 0,
  `presupuestoId` varchar(191) NOT NULL,
  `productoId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `PresupuestoItem_presupuestoId_fkey` (`presupuestoId`),
  KEY `PresupuestoItem_productoId_fkey` (`productoId`),
  CONSTRAINT `PresupuestoItem_presupuestoId_fkey` FOREIGN KEY (`presupuestoId`) REFERENCES `Presupuesto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PresupuestoItem_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PresupuestoItem`
--

LOCK TABLES `PresupuestoItem` WRITE;
/*!40000 ALTER TABLE `PresupuestoItem` DISABLE KEYS */;
/*!40000 ALTER TABLE `PresupuestoItem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Producto`
--

DROP TABLE IF EXISTS `Producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Producto` (
  `id` varchar(191) NOT NULL,
  `nombre` varchar(191) NOT NULL,
  `referencia_fab` varchar(191) DEFAULT NULL,
  `espesor` double DEFAULT NULL,
  `largo` double DEFAULT NULL,
  `ancho` double DEFAULT NULL,
  `precioUnitario` double NOT NULL,
  `pesoUnitario` double NOT NULL,
  `costo` double DEFAULT NULL,
  `tieneTroquel` tinyint(1) DEFAULT 0,
  `clienteId` varchar(191) DEFAULT NULL,
  `fabricanteId` varchar(191) DEFAULT NULL,
  `materialId` varchar(191) DEFAULT NULL,
  `precioVentaFab` double DEFAULT NULL,
  `precioVentaInt` double DEFAULT NULL,
  `precioVentaFin` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Producto_clienteId_fkey` (`clienteId`),
  KEY `Producto_fabricanteId_fkey` (`fabricanteId`),
  KEY `Producto_materialId_fkey` (`materialId`),
  CONSTRAINT `Producto_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Producto_fabricanteId_fkey` FOREIGN KEY (`fabricanteId`) REFERENCES `Fabricante` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Producto_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Producto`
--

LOCK TABLES `Producto` WRITE;
/*!40000 ALTER TABLE `Producto` DISABLE KEYS */;
INSERT INTO `Producto` VALUES
('01a18130-2e99-42ce-93af-21a576a65135','ANTIPOLVO TRITURADORAS PMA-2.0 / PMA-2.0FREATT (TRITOD) - GOMA - PROMAGRI','ANTIPOLVO TRITURADORAS PMA-2.0 / PMA-2.0FREATT (TRITOD)',12,1950,160,10.3,4.6,0,0,NULL,'de99a3d9-daff-49f4-a2a6-9403024c7832','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',15.45,18.025,20.6),
('0293bb45-34e7-41e2-8ac3-27baff107479','AGM0041 - PVC - Moresil','AGM0041',0,1920,750,0,0,0,0,NULL,'5a897571-79ed-4838-870d-b69fcda0decc','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('04e5e8ba-7ccb-4603-8b2a-9b1f9b0bd148','PVC SOLERA - PVC - PVC','PVC SOLERA',0,5700,600,0,0,0,0,NULL,'960454c8-41f1-4130-9dbe-3768cae85787','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('09f3b7a0-e116-44df-b063-643ba8006288','400/4 - GOMA - BANDA CAUCHO','400/4',10,1000,400,9.87,4.72,9.87,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',14.805,17.2725,19.74),
('0a1d9a93-d8f2-4abe-924c-9f52c1b97754','CM6.16 6+2 - GOMA - Industrias Barraza','CM6.16 6+2',12,705,500,11.63,5.2,11.63,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',17.445,20.3525,23.26),
('0c6347f7-2a2c-481b-809d-2a38970bad90','PA8-2 - GOMA - Noli','PA8-2',15,1200,500,23.08,11.4,23.08,0,NULL,'6dca7196-e784-4e9c-b51c-0426ff12481a','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',34.62,40.39,46.16),
('11c3f6e4-5cb2-402f-8524-3fc2d2df61d9','TOLVA CASTILLERO - PVC - CASTILLERO INFANTE','TOLVA CASTILLERO',0,6000,400,0,0,0,0,NULL,'67fe8445-32f2-4b3a-b6ea-c01d873be592','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('1367c66e-4dc6-42d3-b179-0acb9d5804b1','600/4 14MM - GOMA - METRAJE CAUCHO','600/4 14MM',15,600,36.5,0.84,0.42,0.84,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',1.26,1.47,1.68),
('16af8d16-13d5-4e55-a692-2a4e98d3f555','VIDELSUR 14X500X680 - GOMA - VIDELSUR','VIDELSUR 14X500X680',15,710,500,13.65,6.74,0,0,NULL,'7121de23-fc0f-4546-b8a8-5e81c8b3d4bb','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',20.475,23.8875,27.3),
('17cc4176-96e4-4609-aeff-93a9d5b26301','GOMA 10 JR - GOMA - METRAJE CAUCHO','GOMA 10 JR',10,650,550,8.82,4.22,8.82,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',13.23,15.435,17.64),
('1a9fc297-4c7c-441f-b3a6-8f3eeac89421','PMC B NEUVO DCH - GOMA - Industrias Barraza','PMC B NEUVO DCH',12,1250,600,24.75,11.06,24.75,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',37.125,43.3125,49.5),
('2329dca0-d137-4c9c-89cc-b38f8cf97d18','0630000010 - GOMA - Halcon','0630000010',10,680,500,8.39,4.01,8.39,0,NULL,'dcfd8882-136e-414d-be69-c04ccaed67fc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',12.585,14.6825,16.78),
('24d2c532-0ce2-4261-9db7-fb90d853b33c','F15 ROLLO 1800 - ROLLO FIELTRO - ROLLO FIELTRO','F15 ROLLO 1800',15.18,1000,1000,194.13,64.98,0,0,NULL,'52ffe75e-5258-464f-8c34-4f7573058db3','bb9169f9-0b06-48ca-9b2b-89e0c7608ea2',291.195,339.7275,388.26),
('24dfdaa9-0528-49e5-b65f-41a41b5f3b3d','TRITURADO PMA-2.0FREAT - PMA-2.0(INFERIOR) - GOMA - PROMAGRI','TRITURADO PMA-2.0FREAT - PMA-2.0(INFERIOR)',6,1964,300,7.9,3.77,7.9,0,NULL,'de99a3d9-daff-49f4-a2a6-9403024c7832','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',11.85,13.825,15.8),
('270eb5c0-ab23-45f2-b9dc-af6cf2a0840c','VIDELSUR 10X500X710 - GOMA - VIDELSUR','VIDELSUR 10X500X710',10,710,500,8.76,4.19,0,0,NULL,'7121de23-fc0f-4546-b8a8-5e81c8b3d4bb','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',13.14,15.33,17.52),
('2802432f-b24e-45d7-ad29-6de5e725a313','CB15 F15 - GOMA - FIELTRO','CB15 F15',10,600,400,5.92,2.83,5.92,0,NULL,'7870feb9-485f-4846-8837-8d9d9a8d08b1','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',8.879999999999999,10.36,11.84),
('2a3bd366-b59c-4f2a-9264-2d3000e989af','CIERRE TRONCO VIEJO - GOMA - MARTIN BOHORQUEZ','CIERRE TRONCO VIEJO',10,500,1200,14.8,7.08,0,0,NULL,'08ddba14-4aef-4fdb-a054-787890a5e3bd','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',22.2,25.9,29.6),
('2b7411dc-2768-41bd-a09a-eb9c48adc483','ESTRELLA AGROISA - VERDE - METRAJE CAUCHO','ESTRELLA AGROISA',10,239,239,2.17,0.62,2.17,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','0a5428e1-c6c9-41fd-b253-76494aa61e90',3.255,3.7975,4.34),
('306121ad-2cf4-4201-8916-d15777e731a1','550/460 X 1200 - GOMA - METRAJE CAUCHO','550/460 X 1200',10,1200,550,16.28,7.79,16.28,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',24.42,28.49,32.56),
('333ddf2b-a8f5-40ef-946c-b60a85f078e4','BORDE ONDULADO 80MM - BORDE ONDULADO 80MM - METRAJE CAUCHO','BORDE ONDULADO 80MM',0,1000,80,0,0,0,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','82581a70-ecf5-408e-bc3b-86b4b6d44232',0,0,0),
('360da019-b024-4bb4-be4f-8a672178c89c','10456413 - GOMA - Halcon','10456413',10,640,600,9.47,4.53,9.47,0,NULL,'dcfd8882-136e-414d-be69-c04ccaed67fc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',14.205,16.5725,18.94),
('37e79912-5e1b-4c69-8be6-c1181ef8433e','VIBROMART GOMA LARGO700 - GOMA - Vibromart','VIBROMART GOMA LARGO700',10,700,500,8.63,4.13,8.63,0,NULL,'5ad3cb21-198f-4e6c-84b5-0642631474b2','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',12.945,15.1025,17.26),
('3f597367-3bcf-48cf-91b0-086f056bb62c','170X390 - PVC - Crispe ','170X390',0,390,170,0,0,0,0,NULL,'bed69565-4946-41db-8fe0-c9d4f80d0323','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('43abc119-0698-451f-b210-340b13416111','0600863B - GOMA - Industrias Barraza','0600863B',8,385,150,1.07,0.51,1.07,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',1.605,1.8725,2.14),
('44984e37-efbb-4e28-935b-845345ee6bcf','Patines - GOMA - Crispe ','Patines',10,170,680,2.85,1.36,2.85,0,NULL,'bed69565-4946-41db-8fe0-c9d4f80d0323','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',4.275,4.9875,5.7),
('45397924-261b-456b-b078-e7e050cb8141','02962 CA12 - CARAMELO - TALLERES MATA CAMPOS','02962 CA12',12,815,500,25.75,5.32,25.75,0,NULL,'a47d6b67-80bc-44c2-a632-debffc165460','dd75928d-14b3-4941-b1c6-00cf07106c73',38.625,45.0625,51.5),
('4588a2c0-d60e-4532-9be6-02041823ec56','CA8-150 - CARAMELO - METRAJE CAUCHO','CA8-150',8,2600,150,17.78,3.4,17.78,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','dd75928d-14b3-4941-b1c6-00cf07106c73',26.67,31.115,35.56),
('46d50f03-9394-4c22-bdbe-f8ada203a632','AGM0043 OREJILLA TOLVA  - PVC - Moresil','AGM0043 OREJILLA TOLVA ',0,390,180,0,0,0,0,NULL,'5a897571-79ed-4838-870d-b69fcda0decc','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('4de1dc3a-4525-49b4-b227-9ea7955ad81b','02963 CA12 - CARAMELO - TALLERES MATA CAMPOS','02963 CA12',12,815,500,25.75,5.32,25.75,0,NULL,'a47d6b67-80bc-44c2-a632-debffc165460','dd75928d-14b3-4941-b1c6-00cf07106c73',38.625,45.0625,51.5),
('4efaf8a7-6f34-4b1f-aa4d-09c69ade633e','550/4 - GOMA - BANDA CAUCHO','550/4',10,1000,550,13.57,6.49,0,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',20.355,23.7475,27.14),
('4effc202-1801-4694-85dd-d74984630f7f','ARCUSIN 10MM - GOMA - ARCUSIN','ARCUSIN 10MM',10,700,400,6.91,3.3,6.91,0,NULL,'10a448b4-134c-44c1-8008-057f99118b8f','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',10.365,12.0925,13.82),
('501333aa-df0a-4fa3-a3bb-c41096f92344','N600 INTERIOR  - GOMA - Noli','N600 INTERIOR ',10,920,600,13.62,6.51,13.62,0,NULL,'6dca7196-e784-4e9c-b51c-0426ff12481a','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',20.43,23.835,27.24),
('51f95cb3-1440-4a65-9c94-a473a14551e5','SOLANO EXTERIOR - GOMA - SOLANO HORIZONTES','SOLANO EXTERIOR',10,600,600,8.88,4.25,8.88,0,NULL,'7aa286b7-85e6-4b01-9529-bf82d7033454','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',13.32,15.54,17.76),
('54a3d6ff-c11b-439d-b50d-7ec103a8db69','PMBC IZQUIERDAS - GOMA - Industrias Barraza','PMBC IZQUIERDAS',10,1250,600,18.5,8.85,0,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',27.75,32.375,37),
('55ed2254-afb8-4e36-9e25-f7d5215d9963','FB65 14MM - GOMA - PELLENC','FB65 14MM',15,700,600,16.15,7.98,16.15,0,NULL,'9a41ec85-62b4-4143-9a10-11f899a390a4','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',24.225,28.2625,32.3),
('5c5731d0-6601-487a-a527-50525a43dd7b','500/4 - GOMA - BANDA CAUCHO','500/4',10,1000,500,12.34,5.9,0,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',18.51,21.595,24.68),
('5d0921fd-193f-4359-b740-f87d38b3c2f0','BAUTISTA SANTILLANA F15 - FIELTRO - Bautista Santillana','BAUTISTA SANTILLANA F15',15,650,600,5.42,1.41,5.42,0,NULL,'657d4304-81f5-41ba-b16f-36345613812d','03bd9047-5c1c-4503-9013-5eb6db24f92c',8.129999999999999,9.485,10.84),
('5ed754bc-04d5-443d-860d-4f47cb586e82','6000891 - GOMA - Industrias Barraza','6000891',12,300,600,5.94,2.65,5.94,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',8.91,10.395,11.88),
('60e871aa-aed6-415f-b92a-6b3c08066698','BAUTISTA SANTIULLA TRAPEZOIDAL TROQUEL - GOMA - Bautista Santillana','BAUTISTA SANTIULLA TRAPEZOIDAL TROQUEL',12,0,0,0,0,0,0,NULL,'657d4304-81f5-41ba-b16f-36345613812d','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',0,0,0),
('64cc7c28-cb14-42d7-8f22-26e5944f314a','MAI600 14 - GOMA - MAI','MAI600 14',15,600,650,15,7.41,15,0,NULL,'b00293a9-f63c-435b-abf0-9d4b9179e901','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',22.5,26.25,30),
('657365d5-0f58-4ae6-a0d5-f3dc780ef651','MARTIN BOHORUQEZ 700 - GOMA - MARTIN BOHORQUEZ','MARTIN BOHORUQEZ 700',10,700,500,8.63,4.13,8.63,0,NULL,'08ddba14-4aef-4fdb-a054-787890a5e3bd','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',12.945,15.1025,17.26),
('669bdc4e-f4cb-48c1-a981-1435a5f87b22','F15 ROLLO 600 - ROLLO FIELTRO - ROLLO FIELTRO','F15 ROLLO 600',15.06,1000,1000,64.71,21.66,64.71,0,NULL,'52ffe75e-5258-464f-8c34-4f7573058db3','bb9169f9-0b06-48ca-9b2b-89e0c7608ea2',97.065,113.2425,129.42),
('6977415a-a89c-4cc5-bc44-a0851ae37ad7','VIBROMART GOMA - GOMA - Vibromart','VIBROMART GOMA',10,600,500,7.4,3.54,7.4,0,NULL,'5ad3cb21-198f-4e6c-84b5-0642631474b2','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',11.1,12.95,14.8),
('7123f1dc-c1c8-4199-b720-d017f9cfa824','FALDON M BOHORQUEZ - GOMA - MARTIN BOHORQUEZ','FALDON M BOHORQUEZ',10,650,500,8.02,3.84,8.02,0,NULL,'08ddba14-4aef-4fdb-a054-787890a5e3bd','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',12.03,14.035,16.04),
('736f08f3-5cff-4b5a-90c0-4a32a022fe6d','AGM0055 - PVC - Moresil','AGM0055',0,1920,180,0,0,0,0,NULL,'5a897571-79ed-4838-870d-b69fcda0decc','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('75339e65-2890-4a6c-84c1-02a00376ef41','F15 ALDAMA - FIELTRO - Aldama','F15 ALDAMA',15,550,680,5.19,1.35,5.19,0,NULL,'142c6a37-5523-40cf-91f1-e89ef8daf256','03bd9047-5c1c-4503-9013-5eb6db24f92c',7.785,9.082500000000001,10.38),
('78693b4e-72a0-48bb-83da-1ac11d645a17','BAUTISTA SANTILLANA 14MM - GOMA - Bautista Santillana','BAUTISTA SANTILLANA 14MM',15,600,650,15,7.41,15,0,NULL,'657d4304-81f5-41ba-b16f-36345613812d','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',22.5,26.25,30),
('7961d650-3034-445f-8a5e-57b4fd09c5a9','170 - PVC - Crispe ','170',0,170,1920,0,0,0,0,NULL,'bed69565-4946-41db-8fe0-c9d4f80d0323','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('7aece25c-85b4-47a8-9a46-ab21a0601da0','F15 JR - FIELTRO - FIELTRO','F15 JR',15,700,550,5.35,1.39,5.35,0,NULL,'7870feb9-485f-4846-8837-8d9d9a8d08b1','03bd9047-5c1c-4503-9013-5eb6db24f92c',8.024999999999999,9.362499999999999,10.7),
('7cef8d8b-dd77-4eda-bbad-f9e8abf44a49','MAI600 14MM - GOMA - Agruiz','MAI600 14MM',15,600,650,15,7.41,15,0,NULL,'9684945d-bdac-4cef-b582-6d0f52ed749b','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',22.5,26.25,30),
('7d0ff99d-38ce-4500-936c-3a00995bddc7','UPI1665A - GOMA - Moresil','UPI1665A',10,1174.4,417,12.08,5.78,12.08,0,NULL,'5a897571-79ed-4838-870d-b69fcda0decc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',18.12,21.14,24.16),
('7edefa2f-3eb0-404d-820e-6e37f1cffe38','60008A06 - GOMA - Industrias Barraza','60008A06',6,650,200,1.74,0.83,1.74,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',2.61,3.045,3.48),
('8125c0f3-4267-4504-a23c-39e0a37c6e33','TACO VIDELSUR DURO - TACO PINZA - VIDELSUR','TACO VIDELSUR DURO',0,540,205,0,0,0,0,NULL,'7121de23-fc0f-4546-b8a8-5e81c8b3d4bb','8ba9283e-2e1c-4425-956d-5499ec1f94c5',0,0,0),
('8cf856be-2799-4139-a401-51e20b8dc89d','N600 EXTERIOR - GOMA - Noli','N600 EXTERIOR',15,600,755,17.42,8.61,17.42,0,NULL,'6dca7196-e784-4e9c-b51c-0426ff12481a','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',26.13,30.485,34.84),
('8f34570d-999c-4efd-b70a-5202b46ed707','B SANTILLANA TROQUEL - GOMA - Bautista Santillana','B SANTILLANA TROQUEL',10,600,630,9.33,4.46,9.33,0,NULL,'657d4304-81f5-41ba-b16f-36345613812d','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',13.995,16.3275,18.66),
('91f2297a-6049-4c60-b3e7-b6504c9c1643','CB15 GOMA10 - GOMA - METRAJE CAUCHO','CB15 GOMA10',10,600,400,5.92,2.83,5.92,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',8.879999999999999,10.36,11.84),
('9246009b-07f1-40f7-ae2c-9f79d978cea8','PMC B PARAGUAS NUEVO - GOMA - Industrias Barraza','PMC B PARAGUAS NUEVO',10,1250,600,18.5,8.85,18.5,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',27.75,32.375,37),
('93642467-0170-471f-8dc7-f6e6a55535ff','N600 F15 - FIELTRO - Noli','N600 F15',15,800,600,6.67,1.73,6.67,0,NULL,'6dca7196-e784-4e9c-b51c-0426ff12481a','03bd9047-5c1c-4503-9013-5eb6db24f92c',10.005,11.6725,13.34),
('95eb5198-dff6-4e15-aa53-948fc3e5b98a','SABANAS - PVC - Crispe ','SABANAS',0,1900,750,0,0,0,0,NULL,'bed69565-4946-41db-8fe0-c9d4f80d0323','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('97501937-d391-4d2c-83a5-327a65b8a662','VIBROART F15 - FIELTRO - Vibromart','VIBROART F15',15,500,650,4.51,1.17,4.51,0,NULL,'5ad3cb21-198f-4e6c-84b5-0642631474b2','03bd9047-5c1c-4503-9013-5eb6db24f92c',6.765,7.8925,9.02),
('9933ea87-52e6-4ff0-9713-b372d79626ef','CB80 4+2 - GOMA - PELLENC','CB80 4+2',10,600,500,7.4,3.54,7.4,0,NULL,'9a41ec85-62b4-4143-9a10-11f899a390a4','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',11.1,12.95,14.8),
('99534f0d-b4bf-49b1-b3ef-2858d0320aba','VARA MOTRIZ  - GOMA - Industrias Barraza','VARA MOTRIZ ',12,200,400,2.64,1.18,2.64,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',3.96,4.62,5.28),
('9a5f6400-7b7c-481a-bf96-4e5e7ef6a111','F15 400X650 - FIELTRO - FIELTRO','F15 400X650',15,650,400,3.61,0.94,3.61,0,NULL,'7870feb9-485f-4846-8837-8d9d9a8d08b1','03bd9047-5c1c-4503-9013-5eb6db24f92c',5.415,6.3175,7.22),
('9acaa308-7178-4f8d-800b-1eaa6b84bd97','MT500 6+2 - GOMA - Industrias Barraza','MT500 6+2',12,570,500,9.4,4.2,9.4,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',14.1,16.45,18.8),
('a26e57d7-d8ef-4f54-b97e-94dbce726d3f','BRAZO TENAZAS 4+2 - GOMA - Industrias Barraza','BRAZO TENAZAS 4+2',10,415,380,3.89,1.86,3.89,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',5.835,6.8075,7.78),
('a65b379b-54e8-439d-a411-a7b5b6e9868b','12356412 - GOMA - Halcon','12356412',10,680,600,10.07,4.81,10.07,0,NULL,'dcfd8882-136e-414d-be69-c04ccaed67fc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',15.105,17.6225,20.14),
('a825499f-3ecd-461f-bd53-7174bb40612f','CIERRE TRONCO MAI500 4+2 - GOMA - MAI','CIERRE TRONCO MAI500 4+2',10,1300,550,17.64,8.44,17.64,0,NULL,'b00293a9-f63c-435b-abf0-9d4b9179e901','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',26.46,30.87,35.28),
('a869fe26-fc34-498b-a509-195b3e6591cf','MT500 4+2 - GOMA - Industrias Barraza','MT500 4+2',10,570,500,7.03,3.36,7.03,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',10.545,12.3025,14.06),
('a9519f9d-4af6-4a7d-8ccd-dcd1dad9ce9e','F10 ROLLO 1800 - ROLLO FIELTRO - ROLLO FIELTRO','F10 ROLLO 1800',10.18,1000,1000,147.51,39.96,147.51,0,NULL,'52ffe75e-5258-464f-8c34-4f7573058db3','bb9169f9-0b06-48ca-9b2b-89e0c7608ea2',221.265,258.1425,295.02),
('aafa41bd-088e-4b4c-81ac-14747bf506ad','F10 ROLLO 1200 - ROLLO FIELTRO - ROLLO FIELTRO','F10 ROLLO 1200',10.12,1000,1000,98.34,26.64,98.34,0,NULL,'52ffe75e-5258-464f-8c34-4f7573058db3','bb9169f9-0b06-48ca-9b2b-89e0c7608ea2',147.51,172.095,196.68),
('ad54d25a-9cc1-4935-937c-7ece6fc055da','B3 CERRADA S/FIN - PVC - ARTUGAL','B3 CERRADA S/FIN',0,3900,550,0,0,0,0,NULL,'af115af4-4e2b-4a9e-8e66-e4ae5522db61','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('ae1f4ca4-dd86-4e81-9c62-98bf1b6130f1','MAI600 F15 - FIELTRO - MAI','MAI600 F15',15,700,600,5.83,1.52,5.83,0,NULL,'b00293a9-f63c-435b-abf0-9d4b9179e901','03bd9047-5c1c-4503-9013-5eb6db24f92c',8.745000000000001,10.2025,11.66),
('ae27f2a7-f5e8-434c-9fe1-2fbcf7a66a0f','F10 600 - FIELTRO - ROLLO FIELTRO','F10 600',10,1000,600,5.6,1.33,5.6,0,NULL,'52ffe75e-5258-464f-8c34-4f7573058db3','03bd9047-5c1c-4503-9013-5eb6db24f92c',8.399999999999999,9.799999999999999,11.2),
('b0d1f77b-698e-4740-a8c0-1446ec28ad1d','PMBC DERECHAS - GOMA - Industrias Barraza','PMBC DERECHAS',10,1250,600,18.5,8.85,0,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',27.75,32.375,37),
('b672576e-1fac-417e-b03d-1639cf9a71aa','500/4 140mm - GOMA - METRAJE CAUCHO','500/4 140mm',15,1000,500,19.23,9.5,19.23,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',28.845,33.6525,38.46),
('b966ce3f-ef00-4549-9cff-5bced2271c89','BAUTISTA SANTILLANA 10MM - GOMA - Bautista Santillana','BAUTISTA SANTILLANA 10MM',10,630,600,9.33,4.46,9.33,0,NULL,'657d4304-81f5-41ba-b16f-36345613812d','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',13.995,16.3275,18.66),
('bb01f815-153f-4a7f-b893-05d59e69052b','MARTIN BOHORUQEZ F15 SALAGRI - FIELTRO - FIELTRO','MARTIN BOHORUQEZ F15 SALAGRI',15,740,500,5.14,1.34,5.14,0,NULL,'7870feb9-485f-4846-8837-8d9d9a8d08b1','03bd9047-5c1c-4503-9013-5eb6db24f92c',7.709999999999999,8.995,10.28),
('bc044a74-0e0c-4313-a559-6b71c13070e1','0600862B - GOMA - Industrias Barraza','0600862B',8,215,150,0.6,0.29,0.6,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',0.8999999999999999,1.05,1.2),
('c042577c-c906-4f7b-a356-e3d00eb33edd','600/4 12MM - GOMA - METRAJE CAUCHO','600/4 12MM',12,1000,600,19.8,8.85,19.8,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',29.7,34.65,39.6),
('c4bf82c4-1a18-4ee5-bd51-3c3d15647961','CIERRE TRONCO NUEVO - GOMA - MARTIN BOHORQUEZ','CIERRE TRONCO NUEVO',8,500,1200,11.12,5.34,11.12,0,NULL,'08ddba14-4aef-4fdb-a054-787890a5e3bd','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',16.68,19.46,22.24),
('c6260af9-7e2f-4d17-9043-5b5979708f3b','800/3 - GOMA - METRAJE CAUCHO','800/3',8,800,1200,17.8,8.54,17.8,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',26.7,31.15,35.6),
('c648a549-d873-441a-a7cd-fc7f236f97e5','F15 MAI500 - FIELTRO - FIELTRO','F15 MAI500',15,700,550,5.35,1.39,5.35,0,NULL,'7870feb9-485f-4846-8837-8d9d9a8d08b1','03bd9047-5c1c-4503-9013-5eb6db24f92c',8.024999999999999,9.362499999999999,10.7),
('c7e59d4b-b4cd-4547-9229-b0e2500d1a25','BOCA PARAGUAS VIBROMAT MODERNO S/MUECA - GOMA - Vibromart','BOCA PARAGUAS VIBROMAT MODERNO S/MUECA',10,1200,500,14.8,7.08,14.8,0,NULL,'5ad3cb21-198f-4e6c-84b5-0642631474b2','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',22.2,25.9,29.6),
('cb12f6f3-4024-467e-93f4-7a60d063a9ab','TOLVA ARTUGAL - PVC - ARTUGAL','TOLVA ARTUGAL',0,6000,470,0,0,0,0,NULL,'af115af4-4e2b-4a9e-8e66-e4ae5522db61','48724242-7ee7-4ee1-9b9f-9fe10f3798b9',0,0,0),
('cde94fd6-d4fd-4f90-bd0b-f2dd9fa6076f','0630000030 - GOMA - Halcon','0630000030',10,640,500,7.89,3.78,7.89,0,NULL,'dcfd8882-136e-414d-be69-c04ccaed67fc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',11.835,13.8075,15.78),
('cf0b076d-0b84-453a-86e9-317d4502f56a','600/3 - GOMA - METRAJE CAUCHO','600/3',8,1000,600,11.12,5.34,11.12,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',16.68,19.46,22.24),
('d0040462-3184-40cc-a5f0-7ca989689f38','800/4 4+2 - GOMA - METRAJE CAUCHO','800/4 4+2',10,1350,800,26.64,12.74,26.64,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',39.96,46.62,53.28),
('d1a81780-2c6f-410f-8260-75f788b5971f','ALDAMA 14 - GOMA - Aldama','ALDAMA 14',15,550,640,13.54,6.69,13.54,0,NULL,'142c6a37-5523-40cf-91f1-e89ef8daf256','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',20.31,23.695,27.08),
('d376a3bf-2757-451b-a933-8f7e0ab4f2a0','3180566020200013 6+2 - GOMA - Topavi','3180566020200013 6+2',12,635,520,10.9,4.87,10.9,0,NULL,'f77a0d4d-51aa-463c-9ff9-18bce94a3273','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',16.35,19.075,21.8),
('d4342793-dc04-414d-a04c-29704b2dfe16','DVT2025B - FIELTRO - Moresil','DVT2025B',10,620,400,2.31,0.55,2.31,0,NULL,'5a897571-79ed-4838-870d-b69fcda0decc','03bd9047-5c1c-4503-9013-5eb6db24f92c',3.465,4.0425,4.62),
('d540ad58-a581-4704-a060-f02d585cb40c','F10 ROLLO 600 - ROLLO FIELTRO - ROLLO FIELTRO','F10 ROLLO 600',10.06,1000,1000,49.17,13.32,49.17,0,NULL,'52ffe75e-5258-464f-8c34-4f7573058db3','bb9169f9-0b06-48ca-9b2b-89e0c7608ea2',73.755,86.0475,98.34),
('d6259f72-5856-48d4-b2fa-094647519e75','VIBROMART 250X610 - GOMA - Vibromart','VIBROMART 250X610',8,610,250,2.83,1.36,2.83,0,NULL,'5ad3cb21-198f-4e6c-84b5-0642631474b2','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',4.245,4.952500000000001,5.66),
('d64ca463-aac0-47b7-81ee-916f5631281c','F15 TIJERA  - FIELTRO - Topavi','F15 TIJERA ',15,550,500,3.82,0.99,3.82,0,NULL,'f77a0d4d-51aa-463c-9ff9-18bce94a3273','03bd9047-5c1c-4503-9013-5eb6db24f92c',5.73,6.685,7.64),
('d800bacf-69ab-4bc9-a5dc-381a07d6df52','600/4 - GOMA - BANDA CAUCHO','600/4',10,1000,600,14.8,7.08,0,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',22.2,25.9,29.6),
('da8fc860-1ff8-4bff-865a-99bf818426da','CIERRE TRONCO BAUTISTA 800 - GOMA - Bautista Santillana','CIERRE TRONCO BAUTISTA 800',10,1300,800,25.66,12.27,25.66,0,NULL,'657d4304-81f5-41ba-b16f-36345613812d','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',38.49,44.905,51.32),
('dd8deb78-eef2-4bb0-8808-cf1ffeb74747','500/4 - GOMA - BANDA CAUCHO','500/4',10,1000,500,12.34,5.9,0,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',18.51,21.595,24.68),
('de61d466-fea4-4be3-a327-c9fa5ab4a720','N500 F15 SALAGRI - FIELTRO - Noli','N500 F15 SALAGRI',15,820,500,5.69,1.48,5.69,0,NULL,'6dca7196-e784-4e9c-b51c-0426ff12481a','03bd9047-5c1c-4503-9013-5eb6db24f92c',8.535,9.957500000000001,11.38),
('e435a9d2-3148-4aa3-a069-aa1158754a13','Boca paraguas - GOMA - Vibromart','Boca paraguas',8,1250,501,11.61,5.57,0,0,NULL,'5ad3cb21-198f-4e6c-84b5-0642631474b2','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',17.415,20.3175,23.22),
('e4ed1c7d-be23-43ea-a1d9-139c7babd250','CB80 14 - GOMA - PELLENC','CB80 14',15,500,600,11.54,5.7,11.54,0,NULL,'9a41ec85-62b4-4143-9a10-11f899a390a4','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',17.31,20.195,23.08),
('e7dfe001-cab0-4410-a848-9e11020dfb33','500/4 12MM - GOMA - METRAJE CAUCHO','500/4 12MM',12,1000,500,16.5,7.38,16.5,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',24.75,28.875,33),
('effb2376-7cd7-41c8-9c53-22ff97bbbe52','F15 500MM - FIELTRO - FIELTRO','F15 500MM',15,10,500,0.07,0.02,0.07,0,NULL,'7870feb9-485f-4846-8837-8d9d9a8d08b1','03bd9047-5c1c-4503-9013-5eb6db24f92c',0.105,0.1225,0.14),
('f032067a-6e69-4748-9fbe-e38c6929ca56','F15 550 - FIELTRO - FIELTRO','F15 550',15,10000,550,76.4,19.86,76.4,0,NULL,'7870feb9-485f-4846-8837-8d9d9a8d08b1','03bd9047-5c1c-4503-9013-5eb6db24f92c',114.6,133.7,152.8),
('f2412be2-8f55-41dc-a8eb-22dacb00526c','AGM0049 - GOMA - Moresil','AGM0049',10,670,160,2.64,1.26,2.64,0,NULL,'5a897571-79ed-4838-870d-b69fcda0decc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',3.96,4.62,5.28),
('f2485cc4-8eae-4dd4-b9b2-3d3802ef0a48','F15 ROLLO 1200 - ROLLO FIELTRO - ROLLO FIELTRO','F15 ROLLO 1200',15.12,1000,1000,129.42,43.32,129.42,0,NULL,'52ffe75e-5258-464f-8c34-4f7573058db3','bb9169f9-0b06-48ca-9b2b-89e0c7608ea2',194.13,226.485,258.84),
('f2fe4ed2-13ae-4673-826d-a18dc9e46cd3','PARAGUAS ALDAMA  - GOMA - Aldama','PARAGUAS ALDAMA ',12,1200,600,23.76,10.62,23.76,0,NULL,'142c6a37-5523-40cf-91f1-e89ef8daf256','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',35.64,41.58000000000001,47.52),
('f3481eda-0f98-404c-9dc1-67add278cb6b','4L ALDAMA - GOMA - Aldama','4L ALDAMA',10,640,550,8.68,4.15,8.68,0,NULL,'142c6a37-5523-40cf-91f1-e89ef8daf256','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',13.02,15.19,17.36),
('f5333f16-f1ff-4e5e-b500-4f3fdc2f05d6','Picador  - GOMA - Moresil','Picador ',8,270,28000,140.16,67.28,140.16,0,NULL,'5a897571-79ed-4838-870d-b69fcda0decc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',210.24,245.28,280.32),
('f6d43b81-046a-4df6-bbd5-f1f0e7ec2726','N600 INTERIOR  - GOMA - Noli','N600 INTERIOR ',10,600,920,13.62,6.51,13.62,0,NULL,'6dca7196-e784-4e9c-b51c-0426ff12481a','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',20.43,23.835,27.24),
('fa6eaee4-1b7c-44c6-8e6b-b150e0e64112','500/4 14mm - GOMA - METRAJE CAUCHO','500/4 14mm',15,1000,500,19.23,9.5,19.23,0,NULL,'2cf46054-7aa7-4e4d-8c8a-98f929cfc1cc','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',28.845,33.6525,38.46),
('fadae6ba-9be6-49ec-90a8-4dc73cadee84','PROFESIONAL C/ENCAJE - GOMA - Topavi','PROFESIONAL C/ENCAJE',10,580,680,9.73,4.65,9.73,0,NULL,'f77a0d4d-51aa-463c-9ff9-18bce94a3273','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',14.595,17.0275,19.46),
('fbe34467-303d-4d8c-9e8c-543af020e824','MAI600 14 EXTERIOR - GOMA - MAI','MAI600 14 EXTERIOR',15,600,700,16.15,7.98,16.15,0,NULL,'b00293a9-f63c-435b-abf0-9d4b9179e901','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',24.225,28.2625,32.3),
('fbf5f578-bb8b-409d-ae5a-60705cc53a9b','PMC B NUEVO IZQ - GOMA - Industrias Barraza','PMC B NUEVO IZQ',10,1250,600,18.5,8.85,18.5,0,NULL,'c145f1a4-40d1-4c0b-a932-d9e32b6e7def','fcc28f2d-0cfc-4c04-b266-cfa9b55371b7',27.75,32.375,37);
/*!40000 ALTER TABLE `Producto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Proveedor`
--

DROP TABLE IF EXISTS `Proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Proveedor` (
  `id` varchar(191) NOT NULL,
  `nombre` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `telefono` varchar(191) DEFAULT NULL,
  `direccion` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Proveedor_nombre_key` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Proveedor`
--

LOCK TABLES `Proveedor` WRITE;
/*!40000 ALTER TABLE `Proveedor` DISABLE KEYS */;
INSERT INTO `Proveedor` VALUES
('33426899-ca5f-47d7-8d1d-4f05a5081c5e','Siban','','+34 900 100 200','Pol. Ind. Central, Nave 5'),
('39088cf4-3970-4f61-ba9e-65dc54c95573','Aeroma Industrial ','no@no',NULL,NULL),
('625c8af6-a838-4c7d-a186-c6a756fbd17b','Esbelt','','932 07 33 11','Carrer de Provença, 385, L\'Eixample, 08025 Barcelona'),
('e0926350-c8e6-470b-8fc4-192d3ad37e88','Fuda China','','','Ciudad de Tiantai, Provincia de Zhejiang, 317210.'),
('ec01cbac-1d7b-4cf5-9c6a-116740be6543','Indubanda','indubanda@gmail.com','986  48 15 06','Polígono, Miraflores-Sárdoma, 4, 36214 Vigo, Pontevedra');
/*!40000 ALTER TABLE `Proveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ReferenciaBobina`
--

DROP TABLE IF EXISTS `ReferenciaBobina`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReferenciaBobina` (
  `id` varchar(191) NOT NULL,
  `nombre` varchar(191) NOT NULL,
  `ancho` double DEFAULT NULL,
  `lonas` int(11) DEFAULT NULL,
  `pesoPorMetroLineal` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ReferenciaBobina_nombre_ancho_lonas_key` (`nombre`,`ancho`,`lonas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ReferenciaBobina`
--

LOCK TABLES `ReferenciaBobina` WRITE;
/*!40000 ALTER TABLE `ReferenciaBobina` DISABLE KEYS */;
INSERT INTO `ReferenciaBobina` VALUES
('03a1b992-052a-4bcb-8561-d1dc16a69e21','EP400/3 3+1.5',1000,3,8.9),
('07921075-0d5f-47d6-8f81-80d8ad7ef981','EP500/4 6+2',500,4,7.37),
('094b0c63-74cb-4a07-abe0-055c3c8ef3d0','GOMA BLANDA',1200,12,1),
('0f0d3e22-2371-4443-a794-c569fec0ff01','EP500/4 4+2',1000,4,11.8),
('0f0d4c57-0d23-403d-9cca-326c64735260','EP500/4 4+2',1400,4,16.55),
('116b7d5c-d29c-4fba-afeb-24f6c48bb9a4','EP 250/2 2+1.5',440,2,3),
('11ee4bf7-7692-4644-85a6-80ecbad4d0c4','CARAMELO',1200,12,1),
('1422f6fc-a4db-4591-bc06-e3e07fe34c2c','EP500/4 4+2',550,4,6.34),
('1b02f817-c520-4363-af2c-05ae76dc83a7','CARAMELO',1600,8,1),
('20dbb21c-3da3-438b-8a48-d5c1986ef623','EP 250/2 2+1.5',650,2,4.16),
('2347c4c8-b60d-4972-96a7-d23fb2269a11','EP500/4 8+3',600,4,11.42),
('2716a634-588d-405d-b5e7-39ca6ade7b49','EP 250/2 2+1.5',600,2,3.84),
('2b8c7da8-388f-429d-9c90-d538fc619211','EP400/3 3+1.5',600,3,5.34),
('433c5210-aad3-40b9-97bf-d6aca2ede8b7','EP500/4 6+2',600,4,8.86),
('4bee9795-591d-4dc9-b1f7-e579f5348994','EP500/4 4+2',1200,4,14.16),
('4f703a43-3a07-4b11-acd0-d13d1f4c99d1','EP400/3 3+1.5',400,3,3.56),
('621911f4-578b-413a-a6a0-0f5d0db252fa','EP400/3 3+1.5',500,3,4.45),
('6bbcfe33-4968-4f36-9dd4-5dc12d4cd07c','GOMA VERDE',1200,10,1),
('779e4fd6-ef6f-4ae4-8e24-db745c97bda3','EP500/4 4+2',650,4,7.67),
('7b9f94e1-4cbb-4a6a-a5e0-f87a05e12432','CARAMELO',1300,10,1),
('83140958-495e-488c-8171-601b9f3948c9','EP630/4 6+2',1200,4,18.04),
('85dd0759-0c28-47ad-940e-2cd590430f8d','EP400/3 3+1.5',1250,3,11.9),
('8c584022-bb23-46ec-98eb-d97c969dc9fc','EP 250/2 2+1.5',400,2,2.56),
('91f3bd9b-c115-4f1a-8a72-a4b270fb6457','EP400/3 3+1.5',800,3,7.12),
('9d17db7f-31e6-4990-99e6-bcb6b5de2397','EP400/3 3+1.5',650,3,5.79),
('a433ee0e-fb8d-4ae5-8f5c-f50e84a39d36','CARAMELO',1200,8,1),
('b3e24d97-5717-467a-80b3-6952180dbbbd','EP500/4 8+3',500,4,9.5),
('de2a25d6-13c6-49bc-b12f-c475be171f67','EP 250/2 2+1.5',500,2,3.2),
('e29d7f1a-fba3-4682-a782-f4acd2be5469','EP500/4 4+2',800,4,9.44),
('e4cda504-adb2-49ce-bcf7-71076179c9e7','EP630/4 6+2',800,4,12.02),
('e5da23e9-74ca-43b1-961e-2df249bc5f11','EP500/4 4+2',600,4,7.08),
('e88ac07c-d95d-4bcb-a586-2f9b214a97d0','EP400/3 3+1.5',540,3,5.13),
('eb192f6e-62dc-40bc-af4a-850ee6338173','EP630/4 6+2',1000,4,15.03),
('ed0d94c0-d90f-4e5d-b226-6c6c3c4fcd92','EP500/4 4+2',1600,4,18.88),
('f8bcad95-45b6-4057-84ab-e9167c5c976d','EP500/4 4+2',500,4,5.95);
/*!40000 ALTER TABLE `ReferenciaBobina` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ReglaDescuento`
--

DROP TABLE IF EXISTS `ReglaDescuento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReglaDescuento` (
  `id` varchar(191) NOT NULL,
  `descripcion` varchar(191) NOT NULL,
  `tipo` varchar(191) NOT NULL,
  `categoria` varchar(191) DEFAULT NULL,
  `tierCliente` varchar(191) DEFAULT NULL,
  `descuento` double NOT NULL,
  `fechaInicio` datetime(3) DEFAULT NULL,
  `fechaFin` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ReglaDescuento`
--

LOCK TABLES `ReglaDescuento` WRITE;
/*!40000 ALTER TABLE `ReglaDescuento` DISABLE KEYS */;
/*!40000 ALTER TABLE `ReglaDescuento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ReglaMargen`
--

DROP TABLE IF EXISTS `ReglaMargen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReglaMargen` (
  `id` varchar(191) NOT NULL,
  `base` varchar(191) NOT NULL,
  `multiplicador` double NOT NULL,
  `gastoFijo` double DEFAULT NULL,
  `descripcion` varchar(191) NOT NULL,
  `tipo` varchar(191) DEFAULT 'General',
  `tipo_categoria` varchar(191) DEFAULT NULL,
  `tierCliente` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ReglaMargen_base_key` (`base`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ReglaMargen`
--

LOCK TABLES `ReglaMargen` WRITE;
/*!40000 ALTER TABLE `ReglaMargen` DISABLE KEYS */;
INSERT INTO `ReglaMargen` VALUES
('4adc6303-c8ed-48e1-a6da-535d90482a6e','FABRICANTE',1.5,0,'FABRICANTE','General',NULL,'FABRICANTE'),
('56a3f64b-76be-4dd9-a508-6479a5f92db2','CLIENTE FINAL',2,0,'CLIENTE FINAL','General',NULL,'CLIENTE FINAL'),
('8ab0bcc3-bba5-4e2d-9e71-b805716a881f','INTERMEDIARIO',1.75,0,'INTERMEDIARIO','General',NULL,'INTERMEDIARIO');
/*!40000 ALTER TABLE `ReglaMargen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Sequence`
--

DROP TABLE IF EXISTS `Sequence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Sequence` (
  `name` varchar(191) NOT NULL,
  `value` int(11) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Sequence`
--

LOCK TABLES `Sequence` WRITE;
/*!40000 ALTER TABLE `Sequence` DISABLE KEYS */;
INSERT INTO `Sequence` VALUES
('pedido',87),
('presupuesto',1);
/*!40000 ALTER TABLE `Sequence` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Stock`
--

DROP TABLE IF EXISTS `Stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Stock` (
  `id` varchar(191) NOT NULL,
  `material` varchar(191) NOT NULL,
  `espesor` double DEFAULT NULL,
  `metrosDisponibles` double NOT NULL,
  `proveedor` varchar(191) DEFAULT NULL,
  `ubicacion` varchar(191) DEFAULT NULL,
  `fechaEntrada` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `costoMetro` double DEFAULT NULL,
  `stockMinimo` double DEFAULT NULL,
  `cantidadBobinas` int(11) DEFAULT 0,
  `metrosInicialesPorBobina` double DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Stock`
--

LOCK TABLES `Stock` WRITE;
/*!40000 ALTER TABLE `Stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `Stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TarifaMaterial`
--

DROP TABLE IF EXISTS `TarifaMaterial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `TarifaMaterial` (
  `id` varchar(191) NOT NULL,
  `material` varchar(191) NOT NULL,
  `espesor` double NOT NULL,
  `precio` double NOT NULL,
  `peso` double NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TarifaMaterial_material_espesor_key` (`material`,`espesor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TarifaMaterial`
--

LOCK TABLES `TarifaMaterial` WRITE;
/*!40000 ALTER TABLE `TarifaMaterial` DISABLE KEYS */;
INSERT INTO `TarifaMaterial` VALUES
('09b86807-ff92-40e3-b274-84b6df9ede59','ROLLO FIELTRO',15.12,167,43.32),
('0c07156f-dfec-4980-bc92-13559e14b9fa','ROLLO FIELTRO',10.12,112,26.64),
('10803e01-b97a-4638-afef-c6d5a632a8cb','GOMA',10,24.67,11.8),
('2b9af1a1-508a-471a-b266-1dc83db8e27a','FIELTRO',15,13.89,3.61),
('34a988e7-0b15-4097-a34e-9f4c9aefa0e6','GOMA',15,38.46,19),
('44bdeabe-d90c-4d7b-8e6d-e2703c039fcd','FIELTRO',10,9.33,2.22),
('5f0f9629-b2cb-4923-b524-c15b13297a6d','GOMA',6,13.4,6.4),
('6a595ad5-745f-49d3-8b88-1db8fbcd9c9a','ROLLO FIELTRO',10.06,56,13.32),
('6ab649ce-ed7d-48a0-938a-6ed5af6f3fc7','GOMA BLANDA',12,45.04,13.06),
('7a731093-48b8-41fd-aade-ac9031f9111d','GOMA',12,33,14.75),
('8ab16d44-f4e7-4716-ba41-37733f706da3','ROLLO FIELTRO',10.18,168,39.96),
('b1348b9e-775b-4510-bdc4-df13c06dc99f','CARAMELO',12,63.18,13.06),
('b1c147da-2822-48a3-8cda-9f2d445482b2','ROLLO FIELTRO',15.06,83,21.66),
('ba5a2764-186d-461a-8287-bbc8c8f2d004','VERDE',10,38.06,10.89),
('ca5d6093-1a59-4a25-9865-db7dbbe29f72','ROLLO FIELTRO',15.18,250,64.98),
('e3b35dfc-2072-48d0-a5c6-34ea1bf46972','CARAMELO',8,45.6,8.71),
('f9354053-ae08-455d-ab17-32fad13163ad','GOMA',8,18.54,8.9);
/*!40000 ALTER TABLE `TarifaMaterial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES
('5afe9c8b-a446-45b2-920e-dd9a0b96a287','fb42dc5cd452ca1792829853a5126627d8e61006abed5e8081c271ebd2f6002b','2025-11-27 07:42:02.704','20251126141237_init_mysql',NULL,NULL,'2025-11-27 07:41:54.365',1),
('79e7eb9b-c944-4aab-87fc-a0da25fb04c3','506b07f577d756517d80c2e2d5a88ca739bc0f4c471d95ecdf98b0ebe9c0804c','2025-11-27 07:42:03.054','20251126153106_cambio',NULL,NULL,'2025-11-27 07:42:02.863',1),
('8fe19d90-2e82-4301-9cb4-6a11d8e0ccde','a44d0fd721090fafc8ff6724a8a449c5f896968daf07857d6a657086e293cf57','2025-11-27 07:42:02.854','20251126142551_add_sequence_model',NULL,NULL,'2025-11-27 07:42:02.713',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-06 11:55:50
