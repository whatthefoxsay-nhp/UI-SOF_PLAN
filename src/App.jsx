import React, { Suspense, useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  MemoryRouter,
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_LocationContext as LocationContext,
} from "react-router-dom";
import { Layout, Spin } from "antd";
import { useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import DangNhap from "./auth/DangNhap";
import SidebarMenu from "./components/Layout/SidebarMenu/SidebarMenu";
import HeaderBar from "./components/Layout/HeaderBar/HeaderBar";
import { useAutoZoom } from "./hooks";
import { TabProvider, useTabs } from "./contexts/TabContext";
import TabBar from "./components/Layout/TabBar/TabBar";

const { Content } = Layout;

const QuanLyKeHoach = React.lazy(() => import("./pages/QuanLyKeHoach/QuanLyKeHoach"));
const QuanLyQuyTrinhDuAn = React.lazy(() => import("./pages/QuanLyQuyTrinhDuAn/QuanLyQuyTrinhDuAn"));
const ChiTietKeHoach = React.lazy(() => import("./pages/QuanLyKeHoach/ChiTietKeHoach"));
const XemKeHoach = React.lazy(() => import("./pages/QuanLyCongViec/LapKeHoach/XemKeHoach/QuanLyKeHoach"));
const NhapCongViec = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/NhapCongViec/NhapCongViec"));
const CongViecPhaiLam = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/CongViecPhaiLam/CongViecPhaiLam"));
const CongViecPhaiLamGiaoViec = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/CongViecPhaiLamGiaoViec/CongViecPhaiLamGiaoViec"));
const CongViecDoiDuyet = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/CongViecDoiDuyet/CongViecDoiDuyet"));
const CongViecKhongHoanThanh = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/CongViecKhongHoanThanh/CongViecKhongHoanThanh"));
const CongViecHoanThanh = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/CongViecHoanThanh/CongViecHoanThanh"));
const BaoCaoCongViecHangNgay = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/BaoCaoCongViecHangNgay/BaoCaoCongViecHangNgay"));
const CongViecHangNgay = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/CongViecHangNgay/CongViecHangNgay"));
const CongViecChuaBaoCao = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/CongViecChuaBaoCao/CongViecChuaBaoCao.jsx"));
const BaoCaoDuAn = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/BaoCaoDuAn/BaoCaoDuAn"));
const LuocDoKeHoach = React.lazy(() => import("./pages/QuanLyCongViec/QuanLyCongViec/LuocDoKeHoach/LuocDoKeHoach"));

const CanhBao = React.lazy(() => import("./pages/QuanLyCongViec/CanhBao/CanhBaoModules").then((module) => ({ default: module.CanhBao })));
const XuLyCanhBao = React.lazy(() => import("./pages/QuanLyCongViec/CanhBao/CanhBaoModules").then((module) => ({ default: module.XuLyCanhBao })));
const BaoCaoCanhBaoHangNgay = React.lazy(() => import("./pages/QuanLyCongViec/CanhBao/CanhBaoModules").then((module) => ({ default: module.BaoCaoCanhBaoHangNgay })));
const LichCanhBaoTheoThang = React.lazy(() => import("./pages/QuanLyCongViec/CanhBao/CanhBaoModules").then((module) => ({ default: module.LichCanhBaoTheoThang })));

const LoaiDoiTuong = React.lazy(() => import("./pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages").then((module) => ({ default: module.LoaiDoiTuong })));
const LoaiCongViec = React.lazy(() => import("./pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages").then((module) => ({ default: module.LoaiCongViec })));
const MucCongViecPhaiLam = React.lazy(() => import("./pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages").then((module) => ({ default: module.MucCongViecPhaiLam })));
const DiemKpi = React.lazy(() => import("./pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages").then((module) => ({ default: module.DiemKpi })));
const TienDoDuAn = React.lazy(() => import("./pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages").then((module) => ({ default: module.TienDoDuAn })));
const TrangThaiDuAn = React.lazy(() => import("./pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages").then((module) => ({ default: module.TrangThaiDuAn })));
const ThuongHieu = React.lazy(() => import("./pages/QuanLyCongViec/LapKeHoach/DanhMucCongViec/DanhMucPages").then((module) => ({ default: module.ThuongHieu })));

const CacTieuChiKPI = React.lazy(() => import("./pages/DieuKhienKPI/CacTieuChiKPI/CacTieuChiKPI"));
const ThietLapKPI = React.lazy(() => import("./pages/DieuKhienKPI/ThietLapKPI/ThietLapKPI"));
const ChiTietKPI = React.lazy(() => import("./pages/DieuKhienKPI/ThietLapKPI/ChiTietKPI"));
const KPIHangThang = React.lazy(() => import("./pages/DieuKhienKPI/KPIHangThang/KPIHangThang"));
const KPIGiamDoc = React.lazy(() => import("./pages/DieuKhienKPI/KPIGiamDoc/KPIGiamDoc"));
const KPINhanSu = React.lazy(() => import("./pages/DieuKhienKPI/KPINhanSu/KPINhanSu"));
const KPIQuanLy = React.lazy(() => import("./pages/DieuKhienKPI/KPIQuanLy/KPIQuanLy"));
const KPIBaoCao = React.lazy(() => import("./pages/DieuKhienKPI/KPIBaoCao/KPIBaoCao"));

const TrangThaiDonXinPhep = React.lazy(() => import("./pages/QuanLyNghiPhep/TrangThaiDonXinPhep/TrangThaiDonXinPhep"));
const BaoCaoDonXinPhep = React.lazy(() => import("./pages/QuanLyNghiPhep/BaoCaoDonXinPhep/BaoCaoDonXinPhep"));
const DonXinPhep = React.lazy(() => import("./pages/QuanLyNghiPhep/DonXinPhep/DonXinPhep"));
const DonXinPhepTheoPhongBan = React.lazy(() => import("./pages/QuanLyNghiPhep/DonXinPhepTheoPhongBan/DonXinPhepTheoPhongBan"));
const BgdDuyetDon = React.lazy(() => import("./pages/QuanLyNghiPhep/BgdDuyetDon/BgdDuyetDon"));
const QuanLyTrucTiepDuyetDon = React.lazy(() => import("./pages/QuanLyNghiPhep/QuanLyTrucTiepDuyetDon/QuanLyTrucTiepDuyetDon"));

const KabanPhongBan = React.lazy(() => import("./pages/QuanLyDuAn/KabanPhongBan/KabanPhongBan"));
const DuAnMau = React.lazy(() => import("./pages/QuanLyDuAn/DanhMucDuAn/DanhMucDuAn").then((module) => ({ default: module.DuAnMau })));
const DanhMucGiaiDoanDuAn = React.lazy(() => import("./pages/QuanLyDuAn/DanhMucDuAn/DanhMucDuAn").then((module) => ({ default: module.DanhMucGiaiDoan })));
const UnderDevelopment = React.lazy(() => import("./pages/Common/UnderDevelopment"));

function RouteListener({ tabKey, syncOuterLocation }) {
  const location = useLocation();
  const { updateTabPath } = useTabs();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    if (fullPath !== tabKey) {
      updateTabPath(tabKey, fullPath);
      syncOuterLocation(fullPath, { replace: true });
    }
  }, [location.pathname, location.search, tabKey, updateTabPath, syncOuterLocation]);

  return null;
}

function TabWrapper({ isSelected, children }) {
  return (
    <div className="page-scroll-wrapper" style={{ display: isSelected ? "block" : "none", height: "100%" }}>
      {children}
    </div>
  );
}

const MemoizedTabContent = React.memo(
  ({ children }) => children,
  (prevProps, nextProps) =>
    prevProps.path === nextProps.path &&
    JSON.stringify(prevProps.state) === JSON.stringify(nextProps.state),
);

function PlanRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/quan-ly-ke-hoach" replace />} />
      <Route path="/quan-ly-ke-hoach" element={<QuanLyKeHoach />} />
      <Route path="/quan-ly-quy-trinh-du-an" element={<QuanLyQuyTrinhDuAn />} />
      <Route path="/quan-ly-ke-hoach/:id" element={<ChiTietKeHoach />} />
      <Route path="/xem-ke-hoach" element={<XemKeHoach />} />
      <Route path="/lap-ke-hoach/loai-doi-tuong" element={<LoaiDoiTuong />} />
      <Route path="/lap-ke-hoach/loai-cong-viec" element={<LoaiCongViec />} />
      <Route path="/lap-ke-hoach/muc-cong-viec-phai-lam" element={<MucCongViecPhaiLam />} />
      <Route path="/lap-ke-hoach/diem-kpi" element={<DiemKpi />} />
      <Route path="/lap-ke-hoach/tien-do-du-an" element={<TienDoDuAn />} />
      <Route path="/lap-ke-hoach/trang-thai-du-an" element={<TrangThaiDuAn />} />
      <Route path="/lap-ke-hoach/thuong-hieu" element={<ThuongHieu />} />
      <Route path="/nhap-cong-viec" element={<NhapCongViec />} />
      <Route path="/cong-viec-phai-lam" element={<CongViecPhaiLam />} />
      <Route path="/cong-viec-phai-lam-giao-viec" element={<CongViecPhaiLamGiaoViec />} />
      <Route path="/cong-viec-doi-duyet" element={<CongViecDoiDuyet />} />
      <Route path="/cong-viec-hoan-thanh" element={<CongViecHoanThanh />} />
      <Route path="/cong-viec-khong-hoan-thanh" element={<CongViecKhongHoanThanh />} />
      <Route path="/bao-cao-cong-viec-hang-ngay" element={<BaoCaoCongViecHangNgay />} />
      <Route path="/bao-cao-du-an" element={<BaoCaoDuAn />} />
      <Route path="/luoc-do-ke-hoach" element={<LuocDoKeHoach />} />
      <Route path="/cong-viec-hang-ngay" element={<CongViecHangNgay />} />
      <Route path="/cong-viec-chua-bao-cao" element={<CongViecChuaBaoCao />} />
      <Route path="/canh-bao" element={<CanhBao />} />
      <Route path="/xu-ly-canh-bao" element={<XuLyCanhBao />} />
      <Route path="/bao-cao-canh-bao-hang-ngay" element={<BaoCaoCanhBaoHangNgay />} />
      <Route path="/lich-canh-bao-theo-thang" element={<LichCanhBaoTheoThang />} />
      <Route path="/trang-thai-don-xin-phep" element={<TrangThaiDonXinPhep />} />
      <Route path="/don-xin-phep" element={<DonXinPhep />} />
      <Route path="/tao-don-xin-phep-theo-phong-ban" element={<DonXinPhepTheoPhongBan />} />
      <Route path="/bao-cao-don-xin-phep" element={<BaoCaoDonXinPhep />} />
      <Route path="/bgd-duyet-don" element={<BgdDuyetDon />} />
      <Route path="/quan-ly-truc-tiep-duyet-don" element={<QuanLyTrucTiepDuyetDon />} />
      <Route path="/cac-tieu-chi-kpi" element={<CacTieuChiKPI />} />
      <Route path="/thiet-lap-kpi" element={<ThietLapKPI />} />
      <Route path="/chi-tiet-kpi" element={<ChiTietKPI />} />
      <Route path="/kpi-hang-thang" element={<KPIHangThang />} />
      <Route path="/kpi-giam-doc" element={<KPIGiamDoc />} />
      <Route path="/kpi-nhan-su" element={<KPINhanSu />} />
      <Route path="/kpi-quan-ly" element={<KPIQuanLy />} />
      <Route path="/kpi-bao-cao" element={<KPIBaoCao />} />
      <Route path="/quan-ly-du-an/workflow-templates" element={<Navigate to="/quan-ly-quy-trinh-du-an?tab=workflow" replace />} />
      <Route path="/quan-ly-du-an/danh-sach" element={<Navigate to="/quan-ly-quy-trinh-du-an?tab=projects" replace />} />
      <Route path="/quan-ly-du-an/chi-tiet/:projectId" element={<QuanLyQuyTrinhDuAn />} />
      <Route path="/quan-ly-du-an/du-an-mau" element={<DuAnMau />} />
      <Route path="/quan-ly-du-an/danh-muc-giai-doan" element={<DanhMucGiaiDoanDuAn />} />
      <Route path="/kaban-phong-ban" element={<KabanPhongBan />} />
      <Route path="*" element={<UnderDevelopment />} />
    </Routes>
  );
}

function AppContent() {
  useAutoZoom(1920);
  const { isAuthenticated } = useAuth();
  const { tabs, activeTabKey } = useTabs();
  const syncOuterLocation = useNavigate();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const width = isSidebarCollapsed ? "80px" : "250px";
    document.documentElement.style.setProperty("--sidebar-width", width);
  }, [isSidebarCollapsed]);

  if (!isAuthenticated) {
    return (
      <LanguageProvider>
        <DangNhap />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <Layout style={{ minHeight: "100vh" }}>
        <SidebarMenu isCollapsed={isSidebarCollapsed} onCollapseChange={setSidebarCollapsed} />
        <HeaderBar isCollapsed={isSidebarCollapsed} />
        <TabBar />
        <Layout>
          <Content className="app-content" style={{ padding: "20px", minHeight: "calc(100vh - 112px)" }}>
            <div style={{ height: "100%", overflow: "hidden" }}>
              <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><Spin size="large" /></div>}>
                {tabs.map((tab) => {
                  const isSelected = activeTabKey === tab.key;
                  const qIdx = tab.path.indexOf("?");
                  const tabPathname = qIdx !== -1 ? tab.path.slice(0, qIdx) : tab.path;
                  const tabSearch = qIdx !== -1 ? tab.path.slice(qIdx) : "";

                  return (
                    <TabWrapper key={tab.key} isSelected={isSelected}>
                      <MemoizedTabContent path={tab.path} state={tab.state}>
                        <NavigationContext.Provider value={null}>
                          <LocationContext.Provider value={null}>
                            <MemoryRouter initialEntries={[{ pathname: tabPathname, search: tabSearch, state: tab.state }]}>
                              <RouteListener tabKey={tab.key} syncOuterLocation={syncOuterLocation} />
                              <PlanRoutes />
                            </MemoryRouter>
                          </LocationContext.Provider>
                        </NavigationContext.Provider>
                      </MemoizedTabContent>
                    </TabWrapper>
                  );
                })}
              </Suspense>
            </div>
          </Content>
        </Layout>
      </Layout>
    </LanguageProvider>
  );
}

function App() {
  return (
    <TabProvider>
      <AppContent />
    </TabProvider>
  );
}

export default App;
