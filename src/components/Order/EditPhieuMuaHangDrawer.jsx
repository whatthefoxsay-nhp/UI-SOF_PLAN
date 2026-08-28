import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Button,
  message,
  Typography,
  Tag,
  InputNumber,
  Row,
  Col,
  Divider,
  Spin,
  Upload,
  Modal,
  Card,
} from "antd";
import {
  Plus,
  Trash2,
  FileDown as FileDownIcon,
  Upload as UploadIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { toMySQLDate } from "../../utils/helpers";
import { useAuth } from "../../contexts/AuthContext";
import {
  getPhieuMuaHangById,
  listChiTietPhieuMuaHang,
  updatePhieuMuaHang,
  listNhaCungCap,
  getAllSanPham,
  getDanhSachKho,
  loadTienTe,
  loadDonVi,
} from "../../services/apiServices";
import { getDefaultWarehouseCode } from "../../constants/warehouseConfig";
import SelectDonVi from "../DropDown/SelectDonVi";
import SelectPhieuDNVT from "../DropDown/SelectPhieuDNVT";
import "../../pages/PhieuMuaHang/PhieuMuaHang.css";

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }
  if (dayjs.isDayjs(value)) {
    return value;
  }
  if (value instanceof Date) {
    return dayjs(value);
  }
  const str = String(value);
  if (/^\d{14}$/.test(str)) {
    return dayjs(str, "YYYYMMDDHHmmss");
  }
  if (/^\d{8}$/.test(str)) {
    return dayjs(str, "YYYYMMDD");
  }
  const parsed = dayjs(str);
  return parsed.isValid() ? parsed : null;
};

const normalizePurchaseOrder = (item) => ({
  maPhieuMuaHang: item?.maPhieuMuaHang ?? item?.maPMH ?? item?.id ?? "",
  phieuDNVT: item?.phieuDNVT ?? "",
  maNhomDonHang: item?.maNhomDonHang ?? "",
  maPMH: item?.maPMH ?? "",
  pbhSo: item?.pbhSo ?? "",
  tenDuAn: item?.tenDuAn ?? "",
  nhaCungCap:
    (item?.maNCC || item?.nhaCungCap) ?? item?.lv008 ?? item?.lv002 ?? "",
  maNCC: item?.maNCC ?? "",
  maKho: item?.maKho ?? item?.lv102 ?? item?.lv003 ?? item?.lv013 ?? "",
  ngayMua: item?.ngayMua ?? item?.lv009 ?? item?.lv004 ?? "",
  ghiChu: item?.ghiChu ?? item?.lv010 ?? item?.lv009 ?? "",
  tongTien: Number(item?.tongTien ?? item?.lv012 ?? 0),
});

const normalizeDetail = (item) => ({
  maNCC: item?.maNCC ?? "",
  maBOM: item?.maBOM ?? "",
  soLuongMua: Number(item?.soLuongMua ?? 0),
  dvt: item?.dvt ?? "",
  donGia: Number(item?.donGia ?? 0),
  donViTien: (item?.donViTien && item.donViTien.length === 3) ? item.donViTien : "VND",
  moTa: item?.moTa ?? "",
  pbh: item?.pbh ?? "",
  ngayGiaoHang: item?.ngayGiaoHang ?? "",
});

const EditPhieuMuaHangDrawer = ({
  open,
  onClose,
  maPMH,
  defaultPhieuDNVT,
  onSaveSuccess,
  isDNVTReadOnly = false,
}) => {
  const { hasPermission } = useAuth();
  const MODULE_CODE = "Wh0021"; // Purchase Orders

  const [editLoading, setEditLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editForm] = Form.useForm();
  const detailsWatch = Form.useWatch("details", editForm);

  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const detailDraftTotal = useMemo(() => {
    if (!detailsWatch || !Array.isArray(detailsWatch)) {
      return 0;
    }
    return detailsWatch.reduce((sum, item) => {
      const qty = Number(item?.soLuongMua || 0);
      const price = Number(item?.donGia || 0);
      return sum + qty * price;
    }, 0);
  }, [detailsWatch]);

  const totalQuantity = useMemo(() => {
    if (!detailsWatch || !Array.isArray(detailsWatch)) {
      return 0;
    }
    return detailsWatch.reduce(
      (sum, item) => sum + Number(item?.soLuongMua || 0),
      0,
    );
  }, [detailsWatch]);

  const productMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.maSp || p.lv001] = p;
    });
    return map;
  }, [products]);

  const fetchSuppliers = useCallback(async () => {
    setSuppliersLoading(true);
    try {
      const data = await listNhaCungCap();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách nhà cung cấp.");
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    setWarehousesLoading(true);
    try {
      const data = await getDanhSachKho();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách kho.");
    } finally {
      setWarehousesLoading(false);
    }
  }, []);

  const fetchAllProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const data = await getAllSanPham();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách sản phẩm.");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchUnits = useCallback(async () => {
    setUnitsLoading(true);
    try {
      const data = await loadDonVi();
      setUnits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách đơn vị.");
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  const fetchCurrencies = useCallback(async () => {
    setCurrenciesLoading(true);
    try {
      const data = await loadTienTe();
      setCurrencies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách tiền tệ.");
    } finally {
      setCurrenciesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchWarehouses();
      fetchAllProducts();
      fetchCurrencies();
      fetchUnits();
    }
  }, [open, fetchSuppliers, fetchWarehouses, fetchAllProducts, fetchCurrencies, fetchUnits]);

  // Load PMH Data when open and maPMH changes
  useEffect(() => {
    const loadOrderData = async () => {
      if (!open || !maPMH) return;
      setEditLoading(true);
      try {
        const header = await getPhieuMuaHangById(maPMH);
        const normalizedHeader = header ? normalizePurchaseOrder(header) : {};
        const detailResponse = await listChiTietPhieuMuaHang(maPMH);
        const details = Array.isArray(detailResponse)
          ? detailResponse.map(normalizeDetail)
          : [];

        editForm.setFieldsValue({
          nhaCungCap: normalizedHeader.nhaCungCap || undefined,
          maKho: normalizedHeader.maKho || undefined,
          phieuDNVT: normalizedHeader.phieuDNVT || defaultPhieuDNVT || undefined,
          ngayMua: parseDateValue(normalizedHeader.ngayMua) || dayjs(),
          ghiChu: normalizedHeader.ghiChu || "",
          details:
            details.length > 0
              ? details.map((item) => ({
                  maBOM: item.maBOM,
                  soLuongMua: item.soLuongMua,
                  dvt: item.dvt,
                  donGia: item.donGia,
                  donViTien: item.donViTien || "VND",
                  moTa: item.moTa,
                  pbh: item.pbh,
                  ngayGiaoHang: parseDateValue(item.ngayGiaoHang),
                }))
              : [
                  {
                    soLuongMua: 1,
                    donViTien: "VND",
                    ngayGiaoHang: dayjs(),
                  },
                ],
        });
      } catch (error) {
        console.error(error);
        message.error("Không thể tải dữ liệu phiếu mua hàng để sửa.");
        onClose();
      } finally {
        setEditLoading(false);
      }
    };

    loadOrderData();
  }, [open, maPMH, editForm, defaultPhieuDNVT, onClose]);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((item) => ({
        label: `${item?.tenNCC || item?.maNCC} (${item?.maNCC})`,
        value: item?.maNCC,
      })),
    [suppliers],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((item) => ({
        label: `${item?.tenKho || item?.maKho} (${item?.maKho})`,
        value: item?.maKho || item?.lv001,
      })),
    [warehouses],
  );

  const currencyOptions = useMemo(
    () =>
      currencies.map((item) => {
        const code = item?.lv001 || "";
        const name = item?.lv002 || "";
        return {
          label: name || code,
          value: code || name,
        };
      }),
    [currencies],
  );

  const productOptions = useMemo(
    () =>
      products.map((item) => ({
        label: `${item?.maSp || item?.lv001} - ${item?.tenSp || item?.lv002}`,
        value: item?.maSp || item?.lv001 || "",
        data: item,
      })),
    [products],
  );

  const handleSelectProduct = (index, productCode, option) => {
    const product = option?.data;
    if (!product) return;

    editForm.setFieldValue(["details", index, "maBOM"], productCode);
    editForm.setFieldValue(["details", index, "dvt"], product.dvt || "");
    editForm.setFieldValue(["details", index, "donGia"], Number(product.giaBan || 0));
    editForm.setFieldValue(["details", index, "moTa"], product.moTa || "");
    editForm.setFieldValue(["details", index, "donViTien"], "VND");
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/templates/MAU_PHIEU_MUA_HANG.xlsx";
    link.download = "MAU_PHIEU_MUA_HANG.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportExcel = (info) => {
    const file = info.file;
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          message.warning("File Excel không có dữ liệu hoặc sai định dạng.");
          return;
        }

        const missingProducts = [];
        const newDetails = jsonData
          .map((row) => {
            const maSp = String(row["Mã Sản Phẩm"] || "").trim();
            if (!maSp) return null;

            const product = productMap[maSp];
            if (!product) {
              missingProducts.push(maSp);
              return null;
            }

            const excelUnit = String(row["Đơn vị 1"] || "").trim();
            let finalUnit = product.maDv || product.lv004 || "";
            if (excelUnit) {
              const foundUnit = units.find(
                (u) =>
                  String(u.tenDonVi || "").toLowerCase() === excelUnit.toLowerCase() ||
                  String(u.maDonVi || "").toLowerCase() === excelUnit.toLowerCase()
              );
              if (foundUnit) finalUnit = foundUnit.maDonVi;
            }

            let deliveryDate = dayjs();
            if (row["Ngày giao hàng"]) {
              const parsedDate = dayjs(row["Ngày giao hàng"]);
              if (parsedDate.isValid()) {
                deliveryDate = parsedDate;
              }
            }

            return {
              maBOM: maSp,
              soLuongMua: Number(row["Số lượng 1"] || 0),
              dvt: finalUnit,
              donGia: Number(row["Giá"] || product.giaBan || 0),
              donViTien: row["Đơn Giá"] || "VND",
              moTa: row["Ghi chú"] || row["Mô tả"] || "",
              ngayGiaoHang: deliveryDate,
            };
          })
          .filter(Boolean);

        if (missingProducts.length > 0) {
          Modal.error({
            title: "Không tìm thấy sản phẩm",
            content: (
              <div>
                <p>Các mã sản phẩm sau không tồn tại trong hệ thống:</p>
                <div
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    background: "#f5f5f5",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                >
                  {missingProducts.map((code) => (
                    <Tag key={code} color="red" style={{ marginBottom: "4px" }}>
                      {code}
                    </Tag>
                  ))}
                </div>
              </div>
            ),
          });
        }

        if (newDetails.length === 0) return;

        const currentDetails = editForm.getFieldValue("details") || [];
        const filteredCurrent = currentDetails.filter((d) => d.maBOM);

        editForm.setFieldsValue({
          details: [...filteredCurrent, ...newDetails],
        });

        message.success(`Đã nhập thành công ${newDetails.length} sản phẩm.`);
      } catch (error) {
        console.error("Import error:", error);
        message.error("Có lỗi xảy ra khi đọc file Excel.");
      }
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleSaveOrder = async () => {
    try {
      if (!hasPermission(MODULE_CODE, "Edit")) {
        message.error("Bạn không có quyền cập nhật phiếu mua hàng");
        return;
      }

      const values = await editForm.validateFields();
      if (!values.details || values.details.length === 0) {
        message.warning("Vui lòng thêm ít nhất một sản phẩm.");
        return;
      }

      setSubmitting(true);

      const detailsPayload = values.details.map((detail) => ({
        maBOM: detail.maBOM || "",
        soLuong: Number(detail.soLuongMua || 0),
        dvt: detail.dvt || "",
        gia: Number(detail.donGia || 0),
        donViGia: detail.donViTien || "VND",
        moTa: detail.moTa || "",
        pbh: detail.pbh || "",
        ngayGiaoHang: detail.ngayGiaoHang ? toMySQLDate(detail.ngayGiaoHang, "date") : "",
      }));

      const tongTien = detailsPayload.reduce(
        (sum, item) => sum + (item.soLuong || 0) * (item.gia || 0),
        0,
      );

      const payload = {
        nhaCungCap: values.nhaCungCap || "",
        maNCC: values.nhaCungCap || "",
        ghiChu: values.ghiChu || "",
        ngayMua: values.ngayMua ? toMySQLDate(values.ngayMua, "datetime") : "",
        tongTien,
        maKho: values.maKho || "",
        phieuDNVT: values.phieuDNVT || "",
        details: detailsPayload,
        maPhieuMuaHang: maPMH,
      };

      await updatePhieuMuaHang(payload);
      message.success("Cập nhật phiếu mua hàng thành công.");
      
      if (typeof onSaveSuccess === "function") {
        onSaveSuccess();
      }
      onClose();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      console.error(error);
      message.error("Không thể lưu phiếu mua hàng, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    editForm.resetFields();
    editForm.setFieldsValue({
      details: [
        {
          soLuongMua: 1,
          donViTien: "VND",
          ngayGiaoHang: dayjs(),
        },
      ],
      ngayMua: dayjs(),
      maKho: getDefaultWarehouseCode() || undefined,
    });
  };

  return (
    <Drawer
      width={1080}
      open={open}
      title="Cập nhật phiếu mua hàng"
      onClose={onClose}
      extra={
        <Space>
          <Button
            icon={<FileDownIcon size={16} />}
            onClick={handleDownloadTemplate}
            className="btn-download-template"
            style={{ color: "#1890ff", borderColor: "#1890ff" }}
          >
            Tải mẫu Excel
          </Button>
          <Upload
            beforeUpload={(file) => {
              handleImportExcel({ file });
              return false;
            }}
            showUploadList={false}
            accept=".xlsx, .xls"
          >
            <Button
              icon={<UploadIcon size={16} />}
              className="btn-import-excel"
              style={{
                backgroundColor: "#52c41a",
                color: "white",
                borderColor: "#52c41a",
              }}
            >
              Nhập từ Excel
            </Button>
          </Upload>
          <Button onClick={resetForm} danger ghost className="btn-reset-form">
            Xoá trắng
          </Button>
          <Button
            type="primary"
            onClick={handleSaveOrder}
            loading={submitting}
            className="btn-save-receipt"
          >
            Cập nhật
          </Button>
        </Space>
      }
    >
      <Spin spinning={editLoading}>
        <Form layout="vertical" form={editForm}>
          <Row gutter={12}>
            <Col flex="1 1 200px">
              <Form.Item
                label="Nhà cung cấp"
                name="nhaCungCap"
                rules={[{ required: true, message: "Vui lòng chọn nhà cung cấp" }]}
              >
                <Select
                  placeholder="Chọn nhà cung cấp"
                  options={supplierOptions}
                  showSearch
                  optionFilterProp="label"
                  loading={suppliersLoading}
                  size="middle"
                />
              </Form.Item>
            </Col>
            <Col flex="1 1 180px">
              <Form.Item
                label="Nhập vào kho"
                name="maKho"
                rules={[{ required: true, message: "Vui lòng chọn kho" }]}
              >
                <Select
                  placeholder="Chọn kho nhập hàng"
                  options={warehouseOptions}
                  loading={warehousesLoading}
                  showSearch
                  optionFilterProp="label"
                  size="middle"
                />
              </Form.Item>
            </Col>
            <Col flex="1 1 180px">
              <Form.Item label="Phiếu đề nghị vật tư" name="phieuDNVT">
                <SelectPhieuDNVT
                  placeholder="Chọn đề nghị vật tư"
                  size="middle"
                  allowClear
                  disabled={isDNVTReadOnly}
                />
              </Form.Item>
            </Col>
            <Col flex="1 1 180px">
              <Form.Item label="Ngày mua" name="ngayMua">
                <DatePicker
                  className="phieu-mua-hang-date-picker"
                  format="DD/MM/YYYY HH:mm"
                  showTime
                  style={{ width: "100%" }}
                  size="middle"
                />
              </Form.Item>
            </Col>
            <Col flex="2 1 300px">
              <Form.Item label="Ghi chú" name="ghiChu">
                <Input placeholder="Thông tin bổ sung cho phiếu mua hàng" size="middle" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Chi tiết phiếu mua hàng</Divider>
          <Form.List name="details">
            {(fields, { add, remove }) => (
              <div className="phieu-mua-hang-details-wrapper">
                <div className="phieu-mua-hang-detail-header">
                  <Row gutter={8}>
                    <Col span={6}>
                      <Typography.Text strong>Sản phẩm</Typography.Text>
                    </Col>
                    <Col span={2}>
                      <Typography.Text strong>SL</Typography.Text>
                    </Col>
                    <Col span={3}>
                      <Typography.Text strong>ĐVT</Typography.Text>
                    </Col>
                    <Col span={3}>
                      <Typography.Text strong>Đơn giá</Typography.Text>
                    </Col>
                    <Col span={2}>
                      <Typography.Text strong>Tiền</Typography.Text>
                    </Col>
                    <Col span={3}>
                      <Typography.Text strong>Ngày GH</Typography.Text>
                    </Col>
                    <Col span={4}>
                      <Typography.Text strong>Mô tả</Typography.Text>
                    </Col>
                    <Col span={1}></Col>
                  </Row>
                </div>
                <div className="phieu-mua-hang-fields-list">
                  {fields.map((field, index) => (
                    <div key={field.key} className="phieu-mua-hang-detail-row">
                      <Row gutter={8} align="top">
                        <Col span={6}>
                          <Form.Item
                            {...field}
                            name={[field.name, "maBOM"]}
                            rules={[{ required: true, message: "Chọn SP" }]}
                          >
                            <Select
                              placeholder="Sản phẩm"
                              options={productOptions}
                              showSearch
                              optionFilterProp="label"
                              loading={productsLoading}
                              onChange={(val, option) =>
                                handleSelectProduct(field.name, val, option)
                              }
                              size="middle"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Form.Item
                            {...field}
                            name={[field.name, "soLuongMua"]}
                            rules={[{ required: true, message: "Nhập SL" }]}
                          >
                            <InputNumber min={0} style={{ width: "100%" }} placeholder="SL" size="middle" />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            {...field}
                            name={[field.name, "dvt"]}
                            rules={[{ required: true, message: "Chọn ĐVT" }]}
                          >
                            <SelectDonVi placeholder="ĐVT" size="middle" />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            {...field}
                            name={[field.name, "donGia"]}
                            rules={[{ required: true, message: "Nhập giá" }]}
                          >
                            <InputNumber
                              min={0}
                              style={{ width: "100%" }}
                              placeholder="Giá"
                              size="middle"
                              formatter={(value) =>
                                value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
                              }
                              parser={(value) => value.replace(/,/g, "")}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Form.Item {...field} name={[field.name, "donViTien"]}>
                            <Select
                              size="middle"
                              options={currencyOptions}
                              loading={currenciesLoading}
                              placeholder="Tệ"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            {...field}
                            name={[field.name, "ngayGiaoHang"]}
                            rules={[
                              {
                                validator: (_, value) => {
                                  const ngayMua = editForm.getFieldValue("ngayMua");
                                  if (value && ngayMua && value.isBefore(ngayMua, "day")) {
                                    return Promise.reject(new Error(">= Ngày mua"));
                                  }
                                  return Promise.resolve();
                                },
                              },
                            ]}
                          >
                            <DatePicker
                              format="DD/MM/YYYY"
                              style={{ width: "100%" }}
                              placeholder="Ngày GH"
                              size="middle"
                              disabledDate={(current) => current && current < dayjs().startOf("day")}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item {...field} name={[field.name, "moTa"]}>
                            <Input placeholder="Mô tả" size="middle" />
                          </Form.Item>
                        </Col>
                        <Col span={1} style={{ textAlign: "center" }}>
                          {fields.length > 1 && (
                            <Button
                              type="link"
                              danger
                              icon={<Trash2 size={16} />}
                              onClick={() => remove(field.name)}
                              size="middle"
                              style={{ padding: 0 }}
                            />
                          )}
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
                <div className="phieu-mua-hang-import-actions" style={{ padding: "0 16px 16px" }}>
                  <Button
                    type="dashed"
                    block
                    onClick={() =>
                      add({
                        soLuongMua: 1,
                        donViTien: "VND",
                        ngayGiaoHang: dayjs(),
                      })
                    }
                    icon={<Plus size={16} />}
                  >
                    Thêm sản phẩm mua hàng
                  </Button>
                </div>
              </div>
            )}
          </Form.List>

          <Card className="phieu-mua-hang-summary-card" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Space direction="vertical" size={4}>
                  <Typography.Text type="secondary">Tổng số lượng mua</Typography.Text>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {Number(totalQuantity || 0).toLocaleString("vi-VN")}
                  </Typography.Title>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" size={4}>
                  <Typography.Text type="secondary">Tổng giá trị dự kiến</Typography.Text>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {Number(detailDraftTotal || 0).toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                      maximumFractionDigits: 0,
                    })}
                  </Typography.Title>
                </Space>
              </Col>
            </Row>
          </Card>
        </Form>
      </Spin>
    </Drawer>
  );
};

export default EditPhieuMuaHangDrawer;
