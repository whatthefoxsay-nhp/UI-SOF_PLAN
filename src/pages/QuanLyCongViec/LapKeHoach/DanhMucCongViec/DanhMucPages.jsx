import DanhMucCongViec from './DanhMucCongViec';
import { danhMucCongViecConfigs } from './danhMucCongViec.config';

export const LoaiDoiTuong = () => <DanhMucCongViec config={danhMucCongViecConfigs.loaiDoiTuong} />;
export const LoaiCongViec = () => <DanhMucCongViec config={danhMucCongViecConfigs.loaiCongViec} />;
export const MucCongViecPhaiLam = () => <DanhMucCongViec config={danhMucCongViecConfigs.mucCongViec} />;
export const DiemKpi = () => <DanhMucCongViec config={danhMucCongViecConfigs.diemKpi} />;
export const TienDoDuAn = () => <DanhMucCongViec config={danhMucCongViecConfigs.tienDoDuAn} />;
export const TrangThaiDuAn = () => <DanhMucCongViec config={danhMucCongViecConfigs.trangThaiDuAn} />;
export const ThuongHieu = () => <DanhMucCongViec config={danhMucCongViecConfigs.thuongHieu} />;
