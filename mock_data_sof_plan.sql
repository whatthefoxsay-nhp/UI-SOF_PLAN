-- ============================================================================
-- DU LIEU MAU (FAKE) - SOF PLAN - Dung de tai hien 16 loi trong Loi_SOF_PLAN.docx
-- ============================================================================
-- CAU TRUC BANG: lay 1:1 tu database that "hao_erp_sofv5_0" (server 192.168.1.20)
--                qua lenh DESCRIBE / Export cau truc trong phpMyAdmin.
-- DU LIEU:        100% tu bia, khong lay bat ky dong nao tu DB that cua cong ty.
--
-- Thu tu tao bang theo dung thu tu khoa ngoai (FK) de tranh loi khi insert.
-- Import file nay vao 1 database rong tren MySQL local (vi du database
-- "hao_erp_sofv5_0" tren localhost) la du de chay lai toan bo 16 loi.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. hr_lv0002 - PHONG BAN
-- ============================================================================
DROP TABLE IF EXISTS `hr_lv0002`;
CREATE TABLE `hr_lv0002` (
  `lv001` char(32) NOT NULL DEFAULT '',
  `lv002` varchar(32) DEFAULT NULL,
  `lv003` varchar(255) DEFAULT NULL,
  `lv004` varchar(255) DEFAULT NULL,
  `lv005` varchar(500) DEFAULT NULL,
  `lv006` tinyint NOT NULL DEFAULT '0',
  `lv007` char(32) NOT NULL,
  `lv008` tinyint(1) NOT NULL DEFAULT '0',
  `lv009` tinyint(1) NOT NULL DEFAULT '0',
  `lv010` tinyint(1) NOT NULL DEFAULT '0',
  `lv011` time NOT NULL DEFAULT '00:00:00',
  `lv099` char(32) NOT NULL,
  `lv100` char(32) NOT NULL,
  `lv101` char(32) NOT NULL,
  `lv102` char(32) NOT NULL,
  `lv103` int NOT NULL DEFAULT '0',
  `lv198` char(32) NOT NULL,
  `lv199` char(32) NOT NULL,
  `lv200` varchar(100) NOT NULL,
  `lv300` char(32) NOT NULL,
  PRIMARY KEY (`lv001`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `hr_lv0002` (lv001, lv003, lv007, lv099, lv100, lv101, lv102, lv198, lv199, lv200, lv300) VALUES
('PB001', 'Phong Cong nghe thong tin', '', '', '', '', '', '', '', '', ''),
('PB002', 'Phong Kinh doanh',          '', '', '', '', '', '', '', '', ''),
('PB003', 'Phong Nhan su',             '', '', '', '', '', '', '', '', '');

-- ============================================================================
-- 2. hr_lv0020 - NHAN VIEN  (lv002 = Ho ten, lv029 = FK -> hr_lv0002.lv001)
-- ============================================================================
DROP TABLE IF EXISTS `hr_lv0020`;
CREATE TABLE `hr_lv0020` (
  `lv001` char(32) NOT NULL,
  `lv002` varchar(255) DEFAULT NULL,
  `lv003` varchar(255) DEFAULT '',
  `lv004` varchar(255) DEFAULT '',
  `lv005` varchar(50) DEFAULT NULL,
  `lv006` varchar(100) DEFAULT NULL,
  `lv007` varchar(50) DEFAULT NULL,
  `lv008` int DEFAULT '0',
  `lv009` tinyint(1) DEFAULT '0',
  `lv010` char(15) DEFAULT NULL,
  `lv011` date DEFAULT NULL,
  `lv012` varchar(50) DEFAULT NULL,
  `lv013` varchar(500) DEFAULT NULL,
  `lv014` varchar(500) DEFAULT NULL,
  `lv015` date DEFAULT NULL,
  `lv016` varchar(255) DEFAULT NULL,
  `lv017` char(6) DEFAULT NULL,
  `lv018` tinyint(1) DEFAULT NULL,
  `lv019` tinyint(1) DEFAULT NULL,
  `lv020` varchar(15) DEFAULT NULL,
  `lv021` date DEFAULT NULL,
  `lv022` char(32) DEFAULT NULL,
  `lv023` char(6) DEFAULT NULL,
  `lv024` char(6) DEFAULT NULL,
  `lv025` char(6) DEFAULT NULL,
  `lv026` varchar(50) DEFAULT NULL,
  `lv027` char(6) DEFAULT NULL,
  `lv028` char(6) DEFAULT NULL,
  `lv029` char(32) DEFAULT NULL,
  `lv030` date DEFAULT NULL,
  `lv031` char(32) DEFAULT NULL,
  `lv032` char(32) DEFAULT NULL,
  `lv033` varchar(50) DEFAULT NULL,
  `lv034` varchar(500) DEFAULT NULL,
  `lv035` varchar(500) DEFAULT NULL,
  `lv036` varchar(10) DEFAULT NULL,
  `lv037` varchar(50) DEFAULT NULL,
  `lv038` varchar(50) DEFAULT NULL,
  `lv039` varchar(20) DEFAULT NULL,
  `lv040` varchar(100) DEFAULT NULL,
  `lv041` varchar(100) DEFAULT NULL,
  `lv042` varchar(500) DEFAULT NULL,
  `lv043` varchar(255) DEFAULT NULL,
  `lv044` date DEFAULT NULL,
  `lv045` varchar(50) DEFAULT NULL,
  `lv049` tinyint NOT NULL DEFAULT '0',
  `lv052` varchar(50) NOT NULL,
  `lv060` varchar(50) NOT NULL,
  `lv061` varchar(50) NOT NULL,
  `lv062` varchar(30) NOT NULL,
  `lv063` varchar(50) NOT NULL,
  `lv064` varchar(30) NOT NULL,
  `lv065` varchar(30) NOT NULL,
  `lv066` varchar(30) NOT NULL,
  `lv067` varchar(50) NOT NULL,
  `lv068` varchar(50) DEFAULT NULL,
  `lv069` tinyint(1) DEFAULT '0',
  `lv081` date NOT NULL,
  `lv099` char(32) NOT NULL,
  `lv100` char(32) DEFAULT NULL,
  `lv101` varchar(100) DEFAULT NULL,
  `lv102` int DEFAULT '0',
  `lv104` datetime NOT NULL,
  `lv105` char(32) NOT NULL,
  `lv106` varchar(100) NOT NULL,
  `lv114` varchar(100) NOT NULL,
  `lv116` varchar(250) NOT NULL,
  `lv196` tinyint(1) NOT NULL DEFAULT '0',
  `lv197` char(32) NOT NULL,
  `lv198` datetime NOT NULL,
  `lv199` varchar(50) NOT NULL,
  `lv200` char(64) NOT NULL,
  `lv201` char(32) NOT NULL,
  `lv202` datetime NOT NULL,
  `lv299` char(32) NOT NULL,
  PRIMARY KEY (`lv001`),
  KEY `hr_lv0020_ibfk_2` (`lv029`),
  CONSTRAINT `hr_lv0020_ibfk_1` FOREIGN KEY (`lv029`) REFERENCES `hr_lv0002` (`lv001`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `hr_lv0020`
(lv001, lv002, lv029, lv052, lv060, lv061, lv062, lv063, lv064, lv065, lv066, lv067, lv081, lv099, lv104, lv105, lv106, lv114, lv116, lv197, lv198, lv199, lv200, lv201, lv202, lv299) VALUES
('NV001', 'Nguyen Van An',   'PB001', '', '', '', '', '', '', '', '', '', '2026-01-01', '', '2026-01-01 00:00:00', '', '', '', '', '', '2026-01-01 00:00:00', '', '', '', '2026-01-01 00:00:00', ''),
('NV002', 'Tran Thi Binh',   'PB001', '', '', '', '', '', '', '', '', '', '2026-01-01', '', '2026-01-01 00:00:00', '', '', '', '', '', '2026-01-01 00:00:00', '', '', '', '2026-01-01 00:00:00', ''),
('NV003', 'Le Van Cuong',    'PB002', '', '', '', '', '', '', '', '', '', '2026-01-01', '', '2026-01-01 00:00:00', '', '', '', '', '', '2026-01-01 00:00:00', '', '', '', '2026-01-01 00:00:00', ''),
('NV004', 'Pham Thi Dung',   'PB002', '', '', '', '', '', '', '', '', '', '2026-01-01', '', '2026-01-01 00:00:00', '', '', '', '', '', '2026-01-01 00:00:00', '', '', '', '2026-01-01 00:00:00', ''),
('NV005', 'Hoang Van Em',    'PB003', '', '', '', '', '', '', '', '', '', '2026-01-01', '', '2026-01-01 00:00:00', '', '', '', '', '', '2026-01-01 00:00:00', '', '', '', '2026-01-01 00:00:00', ''),
('admin', 'Quan tri vien',   'PB001', '', '', '', '', '', '', '', '', '', '2026-01-01', '', '2026-01-01 00:00:00', '', '', '', '', '', '2026-01-01 00:00:00', '', '', '', '2026-01-01 00:00:00', '');

-- ============================================================================
-- 3. cr_lv0004 - KE HOACH / DU AN GOC (lv002 = Ten ke hoach)
--    Day la bang cha bat buoc cua cr_lv0005 (moi Cong viec phai thuoc 1 Ke hoach)
-- ============================================================================
DROP TABLE IF EXISTS `cr_lv0004`;
CREATE TABLE `cr_lv0004` (
  `lv001` char(32) NOT NULL DEFAULT '',
  `lv002` varchar(255) DEFAULT NULL,
  `lv003` datetime DEFAULT NULL,
  `lv004` char(32) DEFAULT NULL,
  `lv005` datetime DEFAULT NULL,
  `lv006` char(32) DEFAULT NULL,
  `lv007` char(32) DEFAULT '0',
  `lv501` int NOT NULL,
  `lv008` tinyint(1) DEFAULT '0',
  `lv009` varchar(1000) DEFAULT NULL,
  `lv010` datetime NOT NULL,
  `lv011` tinyint NOT NULL,
  `lv069` char(32) NOT NULL,
  `lv072` decimal(28,2) NOT NULL DEFAULT '0.00',
  `lv073` decimal(28,2) NOT NULL DEFAULT '0.00',
  `lv074` date NOT NULL,
  `lv075` decimal(28,2) NOT NULL DEFAULT '0.00',
  `lv076` char(32) NOT NULL,
  `lv077` date NOT NULL,
  `lv078` date NOT NULL,
  `lv079` char(32) NOT NULL,
  `lv080` char(32) NOT NULL,
  `lv081` char(32) NOT NULL,
  `lv082` varchar(255) NOT NULL,
  `lv083` varchar(255) NOT NULL,
  `lv084` char(32) NOT NULL,
  `lv085` char(32) NOT NULL,
  `lv086` char(32) NOT NULL,
  `lv087` datetime NOT NULL,
  `lv088` char(32) NOT NULL,
  `lv089` datetime NOT NULL,
  `lv096` char(32) NOT NULL,
  `lv097` varchar(100) DEFAULT NULL,
  `lv098` tinyint(1) NOT NULL DEFAULT '0',
  `lv099` tinyint(1) DEFAULT '0',
  `lv100` tinyint(1) NOT NULL DEFAULT '0',
  `lv101` date NOT NULL,
  `lv102` decimal(28,0) NOT NULL DEFAULT '0',
  PRIMARY KEY (`lv001`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `cr_lv0004`
(lv001, lv002, lv501, lv010, lv011, lv069, lv074, lv076, lv077, lv078, lv079, lv080, lv081, lv082, lv083, lv084, lv085, lv086, lv087, lv088, lv089, lv096, lv101) VALUES
('KH2026001', 'Ke hoach trien khai SOF PLAN', 1, '2026-01-05 08:00:00', 1, '', '2026-01-05', '', '2026-01-05', '2026-06-30', '', '', '', '', '', '', '', '', '2026-01-05 08:00:00', '', '2026-01-05 08:00:00', '', '2026-01-05'),
('KH2026002', 'Ke hoach nang cap ERP kho van', 2, '2026-02-01 08:00:00', 1, '', '2026-02-01', '', '2026-02-01', '2026-08-31', '', '', '', '', '', '', '', '', '2026-02-01 08:00:00', '', '2026-02-01 08:00:00', '', '2026-02-01'),
('KH2026003', 'Ke hoach dao tao nhan su moi',  3, '2026-03-10 08:00:00', 1, '', '2026-03-10', '', '2026-03-10', '2026-04-30', '', '', '', '', '', '', '', '', '2026-03-10 08:00:00', '', '2026-03-10 08:00:00', '', '2026-03-10');

-- ============================================================================
-- 4. cr_lv0005 - CONG VIEC (bang loi cho 3 man: Nhap cong viec / Cho duyet / Phai lam)
--    lv002 = FK -> cr_lv0004.lv001 (ke hoach)
--    lv004 = noi dung cong viec (varchar 4096)
--    lv008 = ma nhan vien phu trach
--    lv011 = co "da giao viec / active" (0/1)
--    lv016 = co "hoan thanh" (nghi van, 0/1)
--    lv027 = co "da de xuat duyet" (0/1)
--    lv049 = co "da duyet" (nghi van, 0/1)
--    => Loi Nhom 3 (T2,T4,T5,T6,T7) deu xoay quanh 4 co nay, cot y nghia chua
--       ro 100%, can doi chieu code luc sua that.
-- ============================================================================
DROP TABLE IF EXISTS `cr_lv0005`;
CREATE TABLE `cr_lv0005` (
  `lv001` bigint NOT NULL,
  `lv002` char(32) DEFAULT NULL,
  `lv003` char(32) DEFAULT NULL,
  `lv501` char(32) DEFAULT NULL,
  `lv004` varchar(4096) DEFAULT NULL,
  `lv005` datetime DEFAULT NULL,
  `lv006` char(32) DEFAULT NULL,
  `lv007` varchar(255) DEFAULT NULL,
  `lv008` char(32) DEFAULT NULL,
  `lv009` char(32) DEFAULT NULL,
  `lv010` datetime DEFAULT NULL,
  `lv011` tinyint(1) DEFAULT '0',
  `lv012` datetime DEFAULT NULL,
  `lv013` char(32) NOT NULL,
  `lv014` char(32) NOT NULL,
  `lv015` char(32) NOT NULL DEFAULT '0',
  `lv016` tinyint(1) DEFAULT '0',
  `lv022` char(32) NOT NULL,
  `lv023` datetime NOT NULL,
  `lv024` char(32) NOT NULL,
  `lv025` datetime NOT NULL,
  `lv026` varchar(255) NOT NULL,
  `lv027` tinyint(1) NOT NULL DEFAULT '0',
  `lv049` tinyint(1) NOT NULL DEFAULT '0',
  `lv089` char(32) NOT NULL,
  PRIMARY KEY (`lv001`),
  KEY `cr_lv0005_ibfk_1` (`lv002`),
  CONSTRAINT `cr_lv0005_ibfk_1` FOREIGN KEY (`lv002`) REFERENCES `cr_lv0004` (`lv001`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `cr_lv0005`
(lv001, lv002, lv004, lv008, lv010, lv011, lv013, lv014, lv016, lv022, lv023, lv024, lv025, lv026, lv027, lv049, lv089) VALUES
-- CV_HRM_001: da giao, dang lam, chua de xuat duyet
(1001, 'KH2026001', 'CV_HRM_001 - Phan tich yeu cau module Nhan su', 'NV001', '2026-07-01 08:00:00', 1, '', '', 0, '', '2026-07-01 08:00:00', '', '2026-07-01 08:00:00', '', 0, 0, ''),
-- CV_HRM_002: da giao, dang lam, chua de xuat duyet (dung de test Loi #5 - khong lay nham giai doan cua CV_HRM_001)
(1002, 'KH2026001', 'CV_HRM_002 - Thiet ke giao dien module Nhan su', 'NV002', '2026-07-03 08:00:00', 1, '', '', 0, '', '2026-07-03 08:00:00', '', '2026-07-03 08:00:00', '', 0, 0, ''),
-- CV_ERP_003: da de xuat duyet, dang cho quan ly duyet
(1003, 'KH2026002', 'CV_ERP_003 - Nang cap kho hang ERP', 'NV003', '2026-07-05 08:00:00', 1, '', '', 0, '', '2026-07-05 08:00:00', '', '2026-07-05 08:00:00', '', 1, 0, ''),
-- CV_ERP_004: da duyet xong
(1004, 'KH2026002', 'CV_ERP_004 - Kiem thu module kho hang', 'NV004', '2026-07-06 08:00:00', 1, '', '', 0, '', '2026-07-06 08:00:00', '', '2026-07-06 08:00:00', '', 1, 1, ''),
-- CV_ERP_005: da hoan thanh (dung de test Loi T3 - man Cong viec hoan thanh)
(1005, 'KH2026002', 'CV_ERP_005 - Ban giao tai lieu huong dan su dung', 'NV003', '2026-07-10 08:00:00', 1, '', '', 1, '', '2026-07-10 08:00:00', '', '2026-07-10 08:00:00', '', 1, 1, ''),
-- CV_TR_006, 007: cong viec dao tao, phuc vu test man Nhap cong viec / Kanban chung
(1006, 'KH2026003', 'CV_TR_006 - Chuan bi giao trinh dao tao nhan su moi', 'NV005', '2026-07-12 08:00:00', 1, '', '', 0, '', '2026-07-12 08:00:00', '', '2026-07-12 08:00:00', '', 0, 0, ''),
(1007, 'KH2026003', 'CV_TR_007 - To chuc buoi dao tao dinh huong', 'NV005', '2026-07-15 08:00:00', 1, '', '', 0, '', '2026-07-15 08:00:00', '', '2026-07-15 08:00:00', '', 0, 0, ''),
(1008, 'KH2026001', 'CV_HRM_008 - Kiem thu module Nhan su', 'NV001', '2026-07-20 08:00:00', 1, '', '', 0, '', '2026-07-20 08:00:00', '', '2026-07-20 08:00:00', '', 0, 0, '');

-- ============================================================================
-- 5. da_lh0002 - DU AN MAU
--    LOI #1: cot lv001 la khoa chinh AUTO_INCREMENT nhung frontend cho nhap tay
--    voi nhan "Ma du an" -> go chu se bi MySQL quy ve 0 -> tu sinh so moi.
-- ============================================================================
DROP TABLE IF EXISTS `da_lh0002`;
CREATE TABLE `da_lh0002` (
  `lv001` int NOT NULL AUTO_INCREMENT,
  `lv002` varchar(255) DEFAULT NULL,
  `lv003` tinyint(1) NOT NULL DEFAULT '0',
  `lv004` varchar(255) NOT NULL DEFAULT '0',
  `lv005` char(32) DEFAULT NULL,
  `lv006` datetime DEFAULT NULL,
  `lv099` char(36) NOT NULL,
  `parent_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`lv001`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `da_lh0002` (lv001, lv002, lv003, lv004, lv005, lv006, lv099, parent_id) VALUES
(1, 'Du an SOF PLAN - Quan ly ke hoach', 1, 'Phan he SOF ERP chinh', 'SOF001', '2026-01-05 08:00:00', '', NULL),
(2, 'Du an nang cap ERP kho van',        1, 'Nang cap kho hang',      'SOF001', '2026-02-01 08:00:00', '', NULL),
(3, 'Du an dao tao nhan su moi',         1, 'Dao tao dinh huong',      'SOF001', '2026-03-10 08:00:00', '', NULL);

-- ============================================================================
-- 6. da_lh0004 - GIAI DOAN (danh muc giai doan dung chung)
--    Ghi chu: lv001 cung la PK AUTO_INCREMENT nhung frontend cho nhap tay
--    "Ma giai doan" (required, KHONG readonly) -> co the dinh cung 1 loi nhu #1.
-- ============================================================================
DROP TABLE IF EXISTS `da_lh0004`;
CREATE TABLE `da_lh0004` (
  `lv001` int NOT NULL AUTO_INCREMENT,
  `lv002` varchar(255) DEFAULT NULL,
  `lv003` tinyint(1) DEFAULT '0',
  `lv004` varchar(255) DEFAULT NULL,
  `lv005` char(32) DEFAULT NULL,
  `lv006` datetime DEFAULT NULL,
  `lv099` char(32) DEFAULT NULL,
  PRIMARY KEY (`lv001`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `da_lh0004` (lv001, lv002, lv003, lv004, lv005, lv006) VALUES
(1, 'Khoi tao',    1, '1', 'SOF001', '2026-01-01 08:00:00'),
(2, 'Trien khai',  1, '2', 'SOF001', '2026-01-01 08:00:00'),
(3, 'Nghiem thu',  1, '3', 'SOF001', '2026-01-01 08:00:00');

-- ============================================================================
-- 7. da_lh0003 - CONG VIEC GIAI DOAN (dung chung cho Tab "Cong viec giai doan"
--    va man Kanban)
--    LOI #2: cot "Mo ta" dang bi frontend gan nham vao lv006 (tinyint 1/0!),
--            trong khi kanban_board.php lai doc mo ta that tu lv007 (varchar255).
--            -> du lieu mau: lv007 chua mo ta that, lv006 chi la co (0/1).
--    LOI #3: lv013/lv019 la kieu DATE NOT NULL, khong co gia tri mac dinh.
--    LOI #5: lv002 (bigint) nghi la FK -> cr_lv0005.lv001 (cong viec cha),
--            nhung KHONG xuat hien trong config field cua frontend -> co the
--            la nguyen nhan khong loc dung theo tung cong viec cha.
--            Du lieu mau: 3 dong dau gan lv002=1001 (CV_HRM_001),
--                         3 dong sau gan lv002=1002 (CV_HRM_002).
-- ============================================================================
DROP TABLE IF EXISTS `da_lh0003`;
CREATE TABLE `da_lh0003` (
  `lv001` bigint NOT NULL AUTO_INCREMENT,
  `lv002` bigint DEFAULT NULL,
  `lv003` int DEFAULT NULL,
  `lv004` varchar(255) DEFAULT NULL,
  `lv005` varchar(255) DEFAULT NULL,
  `lv006` tinyint(1) DEFAULT '0',
  `lv007` varchar(255) DEFAULT NULL,
  `lv008` int DEFAULT '0',
  `lv009` char(32) NOT NULL DEFAULT '0',
  `lv010` datetime DEFAULT NULL,
  `lv011` int DEFAULT NULL,
  `lv012` varchar(255) DEFAULT NULL,
  `lv013` date NOT NULL,
  `lv014` char(32) DEFAULT NULL,
  `lv015` char(32) DEFAULT NULL,
  `lv016` char(32) DEFAULT NULL,
  `lv017` varchar(255) DEFAULT NULL,
  `lv018` varchar(64) NOT NULL,
  `lv019` date NOT NULL,
  `lv099` char(32) DEFAULT NULL,
  PRIMARY KEY (`lv001`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `da_lh0003`
(lv001, lv002, lv003, lv004, lv005, lv006, lv007, lv008, lv013, lv018, lv019) VALUES
-- 3 giai doan cua CV_HRM_001 (cr_lv0005.lv001 = 1001)
(1, 1001, 1, 'GD001-01', 'Khoi tao yeu cau', 1, 'Thu thap yeu cau tu phong nhan su, lam viec truc tiep voi truong phong', 1, '2026-07-01', '1', '2026-07-05'),
(2, 1001, 2, 'GD001-02', 'Trien khai phan tich', 0, 'Phan tich nghiep vu chi tiet, ve so do quy trinh hien tai va de xuat',    1, '2026-07-06', '1', '2026-07-15'),
(3, 1001, 3, 'GD001-03', 'Nghiem thu ban phan tich', 0, 'Trinh bay ket qua phan tich cho ban giam doc phe duyet',              1, '2026-07-16', '1', '2026-07-20'),
-- 3 giai doan cua CV_HRM_002 (cr_lv0005.lv001 = 1002) - phai TACH BIET voi CV_HRM_001
(4, 1002, 1, 'GD002-01', 'Khoi tao thiet ke', 1, 'Ve wireframe cho man hinh quan ly nhan vien',                          2, '2026-07-03', '1', '2026-07-08'),
(5, 1002, 2, 'GD002-02', 'Trien khai UI', 0, 'Dung UI len React theo wireframe da duyet',                                2, '2026-07-09', '1', '2026-07-18'),
(6, 1002, 3, 'GD002-03', 'Nghiem thu giao dien', 0, 'Demo giao dien cho nguoi dung cuoi gop y',                          2, '2026-07-19', '1', '2026-07-25');

-- ============================================================================
-- 8. da_lh0006 - ICON DU AN
-- ============================================================================
DROP TABLE IF EXISTS `da_lh0006`;
CREATE TABLE `da_lh0006` (
  `lv001` int NOT NULL AUTO_INCREMENT,
  `lv018` int NOT NULL DEFAULT '0',
  `lv005` varchar(50) NOT NULL,
  `lv006` varchar(50) NOT NULL,
  `lv007` varchar(50) NOT NULL,
  PRIMARY KEY (`lv001`),
  KEY (`lv018`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `da_lh0006` (lv001, lv018, lv005, lv006, lv007) VALUES
(1, 1, 'Du an CNTT', 'fa-laptop-code', '#1677ff'),
(2, 2, 'Du an Kho van', 'fa-warehouse', '#52c41a');

-- ============================================================================
-- 9. da_lh0007 - GIAI DOAN CHO CONG VIEC (phan quyen phong ban theo giai doan,
--    dung boi Kanban board de kiem tra quyen xem/sua)
-- ============================================================================
DROP TABLE IF EXISTS `da_lh0007`;
CREATE TABLE `da_lh0007` (
  `lv001` int NOT NULL AUTO_INCREMENT,
  `lv018` int NOT NULL,
  `lv002` varchar(255) NOT NULL,
  `lv003` int NOT NULL,
  `lv004` int DEFAULT NULL,
  `lv005` tinyint NOT NULL,
  `lv008` tinyint(1) NOT NULL DEFAULT '0',
  `lv009` int NOT NULL DEFAULT '1',
  `lv010` int DEFAULT NULL,
  PRIMARY KEY (`lv001`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `da_lh0007` (lv001, lv018, lv002, lv003, lv004, lv005, lv008, lv009, lv010) VALUES
(1, 1, 'NV001,NV002', 1, 1, 1, 1, 1, NULL),
(2, 1, 'NV001,NV002', 2, 1, 1, 0, 1, NULL),
(3, 2, 'NV003,NV004', 1, 2, 1, 1, 1, NULL);

-- ============================================================================
-- 10. cr_lv0092 - LOAI CONG VIEC (bang lookup nho, dung cho dropdown "Loai CV")
--     Luu y: day la 1 bang RIENG, khac voi man hinh "Nhap cong viec" (cung ten
--     ma service cr_lv0092 nhung man hinh do doc/ghi thuc su vao bang cr_lv0005).
-- ============================================================================
DROP TABLE IF EXISTS `cr_lv0092`;
CREATE TABLE `cr_lv0092` (
  `lv001` tinyint NOT NULL DEFAULT '0',
  `lv002` varchar(255) DEFAULT NULL,
  `lv003` varchar(255) DEFAULT NULL,
  `lv004` int DEFAULT '0',
  `lv005` char(32) DEFAULT NULL,
  `lv006` datetime DEFAULT NULL,
  `lv007` char(32) DEFAULT NULL,
  `lv099` char(36) NOT NULL,
  PRIMARY KEY (`lv001`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `cr_lv0092` (lv001, lv002, lv003, lv004, lv099) VALUES
(1, 'Cong viec thuong xuyen', 'Lap lai hang ngay/tuan', 1, ''),
(2, 'Cong viec du an', 'Gan voi 1 ke hoach cu the', 2, ''),
(3, 'Cong viec dot xuat', 'Phat sinh khong theo ke hoach', 3, '');

-- ============================================================================
-- 11. cr_lv0046 - CANH BAO
--     LOI T10: 3 canh bao cung roi vao ngay 2026-08-06 -> dung de kiem tra
--     "Lich canh bao theo thang" co hien du ca 3 hay chi hien 1.
-- ============================================================================
DROP TABLE IF EXISTS `cr_lv0046`;
CREATE TABLE `cr_lv0046` (
  `lv001` bigint NOT NULL AUTO_INCREMENT,
  `lv002` char(32) DEFAULT NULL,
  `lv003` bigint DEFAULT NULL,
  `lv004` char(32) DEFAULT NULL,
  `lv005` char(38) DEFAULT NULL,
  `lv006` date DEFAULT NULL,
  `lv007` date DEFAULT NULL,
  `lv008` int DEFAULT '0',
  `lv009` varchar(4096) DEFAULT '0',
  `lv010` tinyint(1) DEFAULT NULL,
  `lv011` char(32) DEFAULT NULL,
  `lv012` datetime DEFAULT NULL,
  `lv013` char(32) NOT NULL,
  `lv014` datetime DEFAULT NULL,
  `lv015` tinyint(1) NOT NULL DEFAULT '0',
  `lv016` varchar(4096) NOT NULL,
  `lv017` tinyint(1) NOT NULL DEFAULT '0',
  `lv069` tinyint(1) NOT NULL DEFAULT '0',
  `lv089` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`lv001`),
  KEY (`lv002`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `cr_lv0046` (lv001, lv002, lv006, lv007, lv008, lv009, lv013, lv016, lv017) VALUES
(1, 'KH2026001', '2026-08-06', '2026-08-06', 0, 'Nhac hop giao ban tuan', 'NV001', 'Nhac nho hop giao ban dau tuan', 0),
(2, 'KH2026001', '2026-08-06', '2026-08-06', 0, 'Han nop bao cao tien do', 'NV001', 'Nop bao cao tien do cho quan ly', 0),
(3, 'KH2026002', '2026-08-06', '2026-08-06', 0, 'Kiem tra kho cuoi ngay', 'NV003', 'Doi chieu so luong ton kho', 0),
(4, 'KH2026002', '2026-08-10', '2026-08-10', 0, 'Ban giao tai lieu ky thuat', 'NV004', 'Gui tai lieu cho doi kiem thu', 0),
(5, 'KH2026003', '2026-08-15', '2026-08-15', 0, 'Chuan bi phong hoc dao tao', 'NV005', 'Dat phong va thiet bi trinh chieu', 0),
(6, 'KH2026003', '2026-08-20', '2026-08-20', 0, 'Gui khao sat sau dao tao', 'NV005', 'Thu thap phan hoi hoc vien', 0);

-- ============================================================================
-- 12. cr_lv0048 - XU LY CANH BAO
--     LOI T9: "Thu" (thu trong tuan) hien khong dau - loi nam o FRONTEND
--     (mang ten Thu tieng Viet bi thieu dau), khong phai o du lieu bang nay.
-- ============================================================================
DROP TABLE IF EXISTS `cr_lv0048`;
CREATE TABLE `cr_lv0048` (
  `lv001` int NOT NULL,
  `lv002` varchar(255) DEFAULT NULL,
  `lv003` tinyint(1) DEFAULT '0',
  `lv004` varchar(255) DEFAULT '0',
  `lv005` char(32) DEFAULT NULL,
  `lv006` datetime DEFAULT NULL,
  `lv099` char(36) NOT NULL,
  PRIMARY KEY (`lv001`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `cr_lv0048` (lv001, lv002, lv003, lv005, lv006, lv099) VALUES
(1, 'Da xu ly nhac hop giao ban', 1, 'NV001', '2026-08-06 09:00:00', ''),
(2, 'Dang xu ly kiem tra kho', 0, 'NV003', '2026-08-06 10:00:00', ''),
(3, 'Da xu ly ban giao tai lieu', 1, 'NV004', '2026-08-10 14:00:00', '');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- HET FILE. Tong cong 12 bang, du de tai hien toan bo 16 loi trong
-- Loi_SOF_PLAN.docx tren MySQL local (khong dung du lieu that cua cong ty).
-- ============================================================================
