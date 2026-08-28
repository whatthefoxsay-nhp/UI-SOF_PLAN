# Ke hoach phan tich va trien khai trang chi tiet Quan ly ke hoach

Ngay lap: 2026-06-05

## 1. Pham vi

Muc tieu la tai lap trang chi tiet ke hoach legacy tu `C:\laragon\www\soferp\soft\cr_lv0094\child.php` sang React tai:

- `C:\Users\Theanh\SOF\QLNS\PMQL_Desktop_ERP\src\pages\QuanLyKeHoach\ChiTietKeHoach.jsx`
- `C:\Users\Theanh\SOF\QLNS\PMQL_Desktop_ERP\src\pages\QuanLyKeHoach\tabs`

Backend moi dung `callAPI()`/`execCRUD()` tai:

- `C:\Users\Theanh\SOF\QLNS\PMQL_Desktop_ERP\src\services\apiServices.js`
- `C:\laragon\www\v2.des.erp.banhangonline.top\services.sof.vn\index.php`
- DAO tai `C:\laragon\www\v2.des.erp.banhangonline.top\clsall`

Yeu cau nghiep vu: logic phai giong legacy, chi thay doi cach truyen/nhan du lieu sang JSON.

## 0. Quyet dinh da chot

1. Khong trien khai `level3lst=23` va `level3lst=24` trong giai doan nay; giu placeholder "Tinh nang sap phat trien" neu can hien thi.
2. Phai trien khai day du cac thao tac legacy co: xem, them, sua, xoa, khoa, mo, duyet, huy duyet va cac action nghiep vu khac neu module cu co.
3. Duoc tai su dung component/module React da co, nhung phai doi chieu logic voi legacy va DAO. Tab `De nghi chi tien` duoc phep tai su dung cac component da co trong module moi.
4. Hai he thong dung chung mot co so du lieu, nen test bang cung `PLAN_ID` va doi chieu truc tiep ket qua giua legacy va React.
5. Neu legacy co bug UI/quyen thi sua theo logic dung trong he thong moi, dong thoi ghi ro diem khac voi legacy.
6. Khong xoa hoac thay doi toan bo logic hien co. Moi thay doi phai them moi hoac boc tach doc lap, tranh anh huong cac module khac.
7. Quan trong: moi logic kiem tra quyen va moi logic cau truy van nghiep vu chi duoc nam trong DAO. `index.php` chi duoc dong vai tro trung gian nhan payload, goi DAO, chuyen doi/tra JSON cho frontend. Khong viet dieu kien quyen, dieu kien loc SQL nghiep vu, hoac rule approve/delete truc tiep trong `index.php`.

## 2. Ket luan phan tich nhanh

Trang chi tiet legacy khong tu render tung chuc nang truc tiep trong `child.php`; no dung `level3lst` de dieu huong qua `cr_menulv0094::GetLinkEmp()`. Moi tab/chuc nang la mot module trong `soft`, module do goi DAO trong `clsall`.

He thong moi da co san:

- Shell trang danh sach: `QuanLyKeHoach.jsx`
- Shell trang chi tiet: `ChiTietKeHoach.jsx`
- Tab `TongHopTab.jsx`
- Tab `XemTongCVTab.jsx`
- Backend route `cr_lv0094_detail`
- Backend route `cr_lv0025_xemtongcv`
- DAO `cr_lv0094.php` moi da co `LV_LoadPlanDetailData($vlv001)` tra JSON tong hop cho nhieu tab.

Van de hien tai:

- Nhieu label trong source React dang bi loi encoding/mojibake, can chuan hoa UTF-8.
- `ChiTietKeHoach.jsx` moi render that su `TongHopTab` va `XemTongCVTab`; cac tab con lai dang la placeholder.
- `LV_LoadPlanDetailData()` da load nhieu dataset, nhung can doi chieu tung tab voi file legacy tuong ung de dam bao dung dieu kien loc, permission, khoa/mo, insert/update/delete.
- Backend `childInsert/childUpdate/childDelete/childApprove/childUnapprove` hien tai co xu huong chua dung nguyen tac vi co mot so mapping/default/action nam o `index.php`. Can refactor theo huong `index.php` chi dispatch, con mapping nghiep vu, default field, dieu kien loc, permission va action nam trong DAO.

## 3. Mapping legacy level3lst

| level3lst | Ten legacy | File giao dien legacy | DAO/class chinh | Trang/Tab React de tao |
|---:|---|---|---|---|
| 0 | Bang tong hop ke hoach | `cr_lv0145/cr_lv0145.php` | `cr_lv0145`, `cr_lv0141`, `cr_lv0379`, `cr_lv0070`, `cr_lv0032` | `TongHopTab.jsx` can nang cap |
| 22 | Bang cong viec Kanban | `cr_lv0094/kanban_loader.php` | `cr_lv0005`, `cr_lv0090` | `KanbanTab.jsx` |
| 21 | Xem tong CV | `cr_lv0025/cr_lv0025-21.php` | `cr_lv0025` | Da co `XemTongCVTab.jsx`, can verify |
| 1 | Nhap cong viec | `cr_lv0092/cr_lv0092-1.php` | `cr_lv0092` | `NhapCongViecTab.jsx` |
| 12 | Giao viec | `cr_lv0005/cr_lv0005_12.php` | `cr_lv0005` | `GiaoViecTab.jsx` |
| 33 | Tien do & DS du kien | `cr_lv0409/cr_lv0409.php` | `cr_lv0409` | `TienDoDuKienTab.jsx` |
| 34 | DS sale tham gia | `cr_lv0414/cr_lv0414.php` | `cr_lv0414` | `SaleThamGiaTab.jsx` |
| 35 | DS nhan vien tham gia | `da_lh0014/da_lh0014.php` | `da_lh0014` | `NhanVienThamGiaTab.jsx` |
| 13 | Thong tin lien he | `cr_lv0129/cr_lv0129.php` | `cr_lv0129` | `ThongTinLienHeTab.jsx` |
| 2 | Bao gia | `sl_lv0010/sl_lv0010-1.php` | `sl_lv0010` | `BaoGiaTab.jsx` |
| 3 | Hop dong | `sl_lv0013/sl_lv0013-1.php` | `sl_lv0013` | `HopDongTab.jsx` |
| 17 | De nghi vat tu | `cr_lv0150/cr_lv0150-17.php` | `cr_lv0150` | `DeNghiVatTuTab.jsx` |
| 4 | Mua hang | `wh_lv0021/wh_lv0021-1.php` | `wh_lv0021` | `MuaHangTab.jsx` |
| 5 | Thu tien | `cr_lv0032/cr_lv0032.php` | `cr_lv0032`, `ac_lv0004`, `ac_lv0005` | `ThuTienTab.jsx` |
| 16 | De nghi chi tien | `cr_lv0202/cr_lv0202-16.php` | `cr_lv0202`, `cr_lv0203` | `DeNghiChiTienTab.jsx` |
| 6 | Chi tien | `cr_lv0033/cr_lv0033.php` | `cr_lv0033`, `ac_lv0004` | `ChiTienTab.jsx` |
| 7 | Nhap kho | `cr_lv0037/cr_lv0037.php` | `cr_lv0037`, `ac_lv0004` | `NhapKhoTab.jsx` |
| 8 | Xuat kho | `cr_lv0038/cr_lv0038.php` | `cr_lv0038`, `ac_lv0004` | `XuatKhoTab.jsx` |
| 10 | Bao hanh PBH | `cr_lv0330/cr_lv0330-11.php` | `cr_lv0330` | `BaoHanhTab.jsx` |
| 11 | Canh bao | `cr_lv0047/cr_lv0047.php` | `cr_lv0047`, `cr_lv0046` | `CanhBaoTab.jsx` |
| 23 | Them icon | `da_lh0006/da_lh0006.php` | `da_lh0006` | Bo qua, placeholder |

Ghi chu: `cr_menulv0094::GetLinkEmp()` con co case `24 -> da_lh0007/da_lh0007.php`, nhung da chot bo qua.

## 4. Luong du lieu moi de giu dung legacy

### 4.1 Shell detail

Frontend:

```js
execCRUD('cr_lv0094_detail', 'loadPlanDetail', { lv001: planId })
```

Backend:

- Load plan cha tu `cr_lv0004`.
- Load summary/counter.
- Load dataset theo tab vao `tabs`.
- Load `columns` gom fields/labels de UI co the render dung cot legacy.
- Tra JSON:

```json
{
  "success": true,
  "plan": {},
  "summary": {},
  "tabs": {
    "tasks": [],
    "quotes": [],
    "contracts": []
  },
  "columns": {},
  "errors": {}
}
```

### 4.2 CRUD child qua DAO

Backend hien co route:

- `childInsert`
- `childUpdate`
- `childDelete`
- `childApprove`
- `childUnapprove`
- `childLock`
- `childUnlock`

Payload de chuan hoa:

```json
{
  "lv001": "PLAN_ID",
  "childKey": "contacts",
  "childId": "ROW_ID",
  "data": {}
}
```

Nguyen tac bat buoc:

- `index.php` khong duoc tu quyet dinh `planField`, default field, permission, SQL condition, approve/delete rule.
- DAO ke thua `lv_controler` la noi duy nhat duoc goi `GetView()`, `GetAdd()`, `GetEdit()`, `GetDel()`, `GetApr()`, `GetUnApr()` va cac rule lien quan.
- Neu can JSON loader/action moi, them method trong DAO, vi du `LV_LoadPlanChildJSON($planID, $childKey)` hoac method rieng theo module.
- `index.php` chi doc `vtable`, `vfun`, payload, goi method DAO tuong ung, va tra JSON.

Can audit tung `childKey` vi khong phai DAO nao cung co `LV_Insert/LV_Update/LV_Delete/LV_Aproval` voi cung semantics.

## 5. Dataset dang co trong `LV_LoadPlanDetailData()`

Da co:

- `plan`
- `summaryItems`
- `tasks`
- `workload`
- `workloadMore`
- `contacts`
- `progress`
- `saleShares`
- `participantStaff`
- `materialRequests`
- `quotes`
- `contracts`
- `purchase`
- `receipts`
- `payments`
- `paymentRequests`
- `inStock`
- `outStock`
- `warrantySale`
- `warrantyPurchase`
- `alerts`

Can bo sung/doi chieu:

- `kanban`: hien co the dung `tasks`, nhung can map trang thai/cot theo `kanban_loader.php`.
- `quotes`: hien dang lay bao gia qua hop dong `sl_lv0013.lv010`; legacy tong hop bao gia con co luong qua job `BBG` va `cr_lv0376`, can doi chieu.
- `purchase`: hien load theo danh sach PMH tu helper, can xac nhan helper dung legacy `wh_lv0021-1.php`.
- `inStock/outStock`: hien query tu `ac_lv0004`; can xac nhan voi `cr_lv0037.php`/`cr_lv0038.php`.
- `alerts`: hien query `cr_lv0046`; can xac nhan `cr_lv0047.php` co dung bang nay va action nao.

## 6. Huong UI

Lay style theo `HDLDKeToan.jsx`:

- Ant Design `Table`, `Drawer`, `Form`, `Tabs`, `Tag`, `Dropdown`, `Popconfirm`.
- Co dong them nhanh neu legacy co inline add.
- Co drawer them/sua chi tiet.
- Co batch action: xoa, duyet, huy duyet, khoa/mo neu DAO ho tro.
- Co export Excel/Word neu tab legacy co nhu cau tuong tu.
- Khong render iframe legacy.

De tranh lap code, nen tao component dung chung:

- `LegacyPlanChildTab.jsx`: table + search + quick add + drawer CRUD.
- `buildLegacyColumns(meta, overrides)`: render cot tu `columns[childKey]`.
- `usePlanChildActions(planId, childKey)`: wrapper `execCRUD('cr_lv0094_detail', ...)`.
- Cac tab phuc tap override form/columns/action rieng.

## 7. Ke hoach trien khai

### Pha 1: Chuan hoa shell va metadata, khong pha logic cu

1. Sua encoding label tieng Viet trong `QuanLyKeHoach.jsx`, `ChiTietKeHoach.jsx`, `TongHopTab.jsx`, `XemTongCVTab.jsx`.
2. Chuan hoa `LEGACY_TABS` dung day du mapping o muc 3.
3. Them `legacyValue`, `childKey`, `oldModule`, `daoClass`, `capabilities`.
4. Sua data path trong tab hien tai: `detailData.tabs[childKey]`, `detailData.columns[childKey]`.
5. Moi thay doi phai them moi hoac boc tach, khong xoa logic dang chay.

### Pha 2: Tao tab dung chung read-only

1. Tao `LegacyPlanChildTab.jsx`.
2. Render tat ca tab con dang co dataset tu `LV_LoadPlanDetailData()`.
3. Them search, pagination, scroll ngang, format date/money/status.
4. Them count tren tab label tu `summary`.

Ket qua pha 2: moi chuc nang trong toolbar legacy deu co man hinh React hien du lieu JSON.

### Pha 3: CRUD cac tab don gian, rule nam trong DAO

Uu tien cac tab co quan he truc tiep voi `planId` va DAO don:

1. `contacts` - `cr_lv0129`
2. `progress` - `cr_lv0409`
3. `saleShares` - `cr_lv0414`
4. `participantStaff` - `da_lh0014`
5. `materialRequests` - `cr_lv0150`
6. `alerts` - `cr_lv0047`

Voi moi tab:

- Audit `LV_Insert/LV_Update/LV_Delete/LV_Aproval/LV_UnAproval`.
- Xac dinh field bat buoc.
- Xac dinh `planField` dung.
- Dua mapping/default/rule vao DAO, khong de o `index.php`.
- Tao form drawer theo field legacy.
- Test insert/update/delete/approve/unapprove tren data that.

### Pha 4: Cong viec va Kanban

1. Hoan thien `XemTongCVTab.jsx` theo `cr_lv0025-21.php`.
2. Tao `NhapCongViecTab.jsx` theo `cr_lv0092-1.php`.
3. Tao `GiaoViecTab.jsx` theo `cr_lv0005_12.php`.
4. Tao `KanbanTab.jsx` dung `tasks`, nhom cot theo trang thai legacy trong `kanban_loader.php`.
5. Kiem tra cac transition: bat dau, de xuat duyet, hoan thanh, duyet, huy duyet.

### Pha 5: Nghiep vu ban hang/mua hang/tai chinh/kho

1. `BaoGiaTab.jsx`: audit `sl_lv0010-1.php`, quan he job `BBG`, chi tiet `cr_lv0376`.
2. `HopDongTab.jsx`: audit `sl_lv0013-1.php`, quan he `lv114`, `lv010`, `lv115`.
3. `MuaHangTab.jsx`: audit `wh_lv0021-1.php`.
4. `ThuTienTab.jsx`: audit `cr_lv0032.php`, `ac_lv0004.lv002=0`.
5. `DeNghiChiTienTab.jsx`: dung/ke thua component hien co `TaoDeNGhiChiTienModal`, `DanhSachDeNghiModal`, `DeNghiChiTienDetailDrawer`.
6. `ChiTienTab.jsx`: audit `cr_lv0033.php`, `ac_lv0004.lv002=1`.
7. `NhapKhoTab.jsx`, `XuatKhoTab.jsx`: audit `cr_lv0037.php`, `cr_lv0038.php`.
8. `BaoHanhTab.jsx`: audit `cr_lv0330-11.php`.

### Pha 6: Kiem thu va doi chieu legacy

1. Chon 3-5 `PLAN_ID` co du nghiep vu: co cong viec, bao gia, hop dong, thu/chi, kho.
2. So sanh count tung tab legacy vs React.
3. So sanh danh sach ma chung tu/doc ID.
4. Test permission bang user admin va user thuong.
5. Test dong/mo plan anh huong update child.
6. Chay build frontend.
7. Chay lint/syntax PHP cho file backend bi sua.

## 8. Cau hoi da chot

1. `level3lst=23`: bo qua, de placeholder tinh nang sap phat trien.
2. `level3lst=24`: bo qua.
3. Muc tieu: lam day du toan bo chuc nang legacy co, khong chi read-only.
4. Duoc tai su dung component/module React da co neu dung logic. Rieng tab de nghi chi tien duoc tai su dung component hien co.
5. Test bang cung database, doi chieu truc tiep legacy va React.
6. Bug UI/quyen legacy: sua theo logic dung trong he thong moi va bao cao ro phan khac legacy.
7. Thu tu/ten tab: giu theo legacy voi mapping nghiep vu, tru cac muc da chot bo qua.

## 9. Rủi ro chính

- Logic legacy nam rai rac trong file giao dien PHP va DAO, khong chi trong DAO.
- Nhieu DAO co ten file legacy dang co suffix `-1`, `_12`, `-16`, `-17`, trong backend moi lai include file khong suffix. Can doi chieu class/function that su truoc khi CRUD.
- Mot so query hien tai trong `LV_LoadPlanDetailData()` co the chi la approximation, chua giong 100% report legacy.
- Encoding source hien tai co loi, neu khong sua se lam UI kho doi chieu nghiep vu.
- Cac action approve/unapprove co rang buoc user/right/status; khong nen chi validate frontend.
- Neu tiep tuc dat mapping/quyen/SQL o `index.php`, se trai kien truc da chot va kho bao tri. Can dua ve DAO khi trien khai.

## 10. De xuat quy tac trien khai

- Moi tab co mot `childKey` on dinh trung voi key trong JSON.
- Backend la noi quyet dinh permission va dieu kien update/delete/approve.
- Frontend chi an/hien nut theo permission, khong thay the validation backend.
- Khong sua DAO legacy theo cach lam mat logic cu; neu can them JSON loader thi boc lai query/function cu.
- Moi thay doi backend can co test bang mot `PLAN_ID` that va so sanh voi legacy.
- `index.php` chi dispatch va serialize JSON; moi logic nghiep vu moi them vao DAO.
