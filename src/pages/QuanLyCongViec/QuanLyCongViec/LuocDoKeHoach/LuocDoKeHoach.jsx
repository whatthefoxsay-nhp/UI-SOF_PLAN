import {
    Alert,
    Breadcrumb,
    Button,
    Card,
    Checkbox,
    Col,
    DatePicker,
    Divider,
    Form,
    Row,
    Select,
    Space,
    Spin,
    message,
    Tooltip as AntTooltip
} from 'antd';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
    Home,
    RefreshCw,
    BarChart3,
    TrendingUp,
    DollarSign,
    Layers,
    Activity,
    Calendar,
    Briefcase
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { callApi, execCRUD } from '../../../../services/apiServices';
import styles from '../../../ChamCong&TienLuong/ChamCong/ChiTietChamCong/styles.module.css';

// Extend dayjs with plugins
dayjs.extend(quarterOfYear);
dayjs.extend(customParseFormat);

const { Option } = Select;

// A premium color palette for chart series stacking
const COLOR_PALETTE = [
    '#0ea5e9', // Sky Blue
    '#10b981', // Emerald Green
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#ef4444', // Rose
    '#3b82f6', // Bright Blue
    '#ec4899', // Pink
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#84cc16', // Lime
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#8b5cf6', // Violet
    '#f43f5e', // Rose Red
];

const LuocDoKeHoach = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Lookup options loaded from backend
    const [lookups, setLookups] = useState({
        statuses: [],
        regions: [],
        employees: [],
        targets: [],
        projectTypes: [],
        projectProgress: [],
        tvtkCompanies: []
    });

    // Subdivided employee list options
    const [salesOptions, setSalesOptions] = useState([]);
    const [ptttOptions, setPtttOptions] = useState([]);
    const [adOptions, setAdOptions] = useState([]);

    // Raw matching projects list
    const [projects, setProjects] = useState([]);

    // Currently observed alltype to render correct DatePicker
    const [alltype, setAlltype] = useState('0');
    // Currently observed dstype to show specific or all charts
    const [dstype, setDstype] = useState('all');

    // 1. Load Lookups on mount
    useEffect(() => {
        const fetchLookups = async () => {
            setLoading(true);
            try {
                const response = await callApi('cr_lv0408', 'loadLookups');
                if (response && response.success && response.lookups) {
                    const lps = response.lookups;
                    setLookups(lps);

                    // Normalize employee arrays using backend lists
                    const listKD = lps.listKD || '';
                    const listPTTT = lps.listPTTT || '';
                    const listAD = lps.listAD || '';

                    const emps = lps.employees || [];

                    // Filter list by department membership
                    const kds = emps.filter(e => listKD.includes(`'${e.id}'`));
                    const pttts = emps.filter(e => listPTTT.includes(`'${e.id}'`));
                    const ads = emps.filter(e => listAD.includes(`'${e.id}'`));

                    setSalesOptions(kds);
                    setPtttOptions(pttts);
                    setAdOptions(ads);
                } else {
                    message.error('Không thể tải danh mục cấu hình bộ lọc.');
                }
            } catch (error) {
                console.error('Failed to load filters lookup:', error);
                message.error('Lỗi kết nối khi tải danh mục cấu hình.');
            } finally {
                setLoading(false);
            }
        };
        fetchLookups();
    }, []);

    // 2. Default Initial Filter Trigger
    useEffect(() => {
        // Trigger data load with default values once lookups are ready
        handleFilterSubmit(form.getFieldsValue());
    }, [lookups]);

    // Handle Form filters submission
    const handleFilterSubmit = async (values) => {
        setLoading(true);
        try {
            // Build filter parameters
            const payload = {
                dstype: values.dstype === 'all' ? '' : values.dstype,
                alltype: values.alltype || '0',
                datetype: values.datetype || '0',
                isShowNVN: values.isShowNVN ? 1 : 0,

                // Comma-separated filters
                lv100: Array.isArray(values.lv100) ? values.lv100.join(',') : '',
                lv085: Array.isArray(values.lv085) ? values.lv085.join(',') : '',
                lv079: Array.isArray(values.lv079) ? values.lv079.join(',') : '',
                lv080: Array.isArray(values.lv080) ? values.lv080.join(',') : '',
                lv081: Array.isArray(values.lv081) ? values.lv081.join(',') : '',
                DoiTuong: Array.isArray(values.DoiTuong) ? values.DoiTuong.join(',') : '',
            };

            // Handle date boundaries depending on alltype
            if (payload.alltype === '0') {
                // Daily
                const range = values.dateRange || [dayjs().startOf('month'), dayjs().endOf('month')];
                payload.datefrom = range[0].format('YYYY-MM-DD');
                payload.dateto = range[1].format('YYYY-MM-DD');
            } else if (payload.alltype === '1') {
                // Monthly
                const range = values.monthRange || [dayjs().startOf('year'), dayjs().endOf('year')];
                payload.monthfrom = range[0].month() + 1;
                payload.monthto = range[1].month() + 1;
                payload.year = range[0].year();
            } else if (payload.alltype === '3') {
                // Quarterly
                const range = values.quarterRange || [dayjs().startOf('year'), dayjs().endOf('year')];
                payload.quyfrom = Math.floor(range[0].month() / 3) + 1;
                payload.quyto = Math.floor(range[1].month() / 3) + 1;
                payload.year = range[0].year();
            } else if (payload.alltype === '2') {
                // Yearly
                const range = values.yearRange || [dayjs().subtract(5, 'year'), dayjs()];
                payload.yearfrom = range[0].year();
                payload.yearto = range[1].year();
            }

            const response = await execCRUD('cr_lv0408', 'loadData', payload);
            if (response && response.success && Array.isArray(response.projects)) {
                setProjects(response.projects);
            } else {
                setProjects([]);
                message.warning(response?.message || 'Không có dữ liệu dự án phù hợp với bộ lọc.');
            }
        } catch (error) {
            console.error('Load plan diagram data failed:', error);
            message.error('Lỗi khi tải dữ liệu kế hoạch.');
        } finally {
            setLoading(false);
        }
    };

    // Reacting to period changes in Form
    const handleValuesChange = (changedValues, allValues) => {
        if (changedValues.alltype !== undefined) {
            setAlltype(changedValues.alltype);
        }
        if (changedValues.dstype !== undefined) {
            setDstype(changedValues.dstype);
        }
    };

    // Reset Filters to default and load again
    const handleReset = () => {
        form.resetFields();
        setAlltype('0');
        setDstype('all');
        handleFilterSubmit(form.getFieldsValue());
    };

    // Date range helper functions
    const generatePeriods = (type, vals) => {
        const periods = [];
        if (type === '0') {
            const range = vals.dateRange || [dayjs().startOf('month'), dayjs().endOf('month')];
            let curr = dayjs(range[0]);
            const last = dayjs(range[1]);
            while (curr.isBefore(last) || curr.isSame(last, 'day')) {
                periods.push({
                    key: curr.format('YYYY-MM-DD'),
                    label: curr.format('DD/MM')
                });
                curr = curr.add(1, 'day');
            }
        } else if (type === '1') {
            const range = vals.monthRange || [dayjs().startOf('year'), dayjs().endOf('year')];
            let curr = dayjs(range[0]).startOf('month');
            const last = dayjs(range[1]).startOf('month');
            while (curr.isBefore(last) || curr.isSame(last, 'month')) {
                periods.push({
                    key: curr.format('YYYY-MM'),
                    label: curr.format('MM/YYYY')
                });
                curr = curr.add(1, 'month');
            }
        } else if (type === '3') {
            const range = vals.quarterRange || [dayjs().startOf('year'), dayjs().endOf('year')];
            let curr = dayjs(range[0]).startOf('quarter');
            const last = dayjs(range[1]).startOf('quarter');
            while (curr.isBefore(last) || curr.isSame(last, 'quarter')) {
                const quarterNum = Math.floor(curr.month() / 3) + 1;
                periods.push({
                    key: `${curr.year()}-Q${quarterNum}`,
                    label: `Quý ${quarterNum}/${curr.year()}`
                });
                curr = curr.add(1, 'quarter');
            }
        } else if (type === '2') {
            const range = vals.yearRange || [dayjs().subtract(5, 'year'), dayjs()];
            let curr = dayjs(range[0]).startOf('year');
            const last = dayjs(range[1]).startOf('year');
            while (curr.isBefore(last) || curr.isSame(last, 'year')) {
                periods.push({
                    key: curr.format('YYYY'),
                    label: curr.format('YYYY')
                });
                curr = curr.add(1, 'year');
            }
        }
        return periods;
    };

    const getProjectPeriodKey = (proj, dateField, type) => {
        const rawDate = proj[dateField];
        if (!rawDate || rawDate.startsWith('1900-01-01') || rawDate.startsWith('0000-00-00')) return null;
        const d = dayjs(rawDate);
        if (!d.isValid()) return null;

        if (type === '0') {
            return d.format('YYYY-MM-DD');
        } else if (type === '1') {
            return d.format('YYYY-MM');
        } else if (type === '3') {
            const quarterNum = Math.floor(d.month() / 3) + 1;
            return `${d.year()}-Q${quarterNum}`;
        } else if (type === '2') {
            return d.format('YYYY');
        }
        return null;
    };

    // Client-side grouping & stack generation logic
    const getChartDataAndKeys = (chartId) => {
        const vals = form.getFieldsValue();
        const type = vals.alltype || '0';
        const datetype = vals.datetype || '0';

        const dateFields = {
            '0': 'lv003', // Created Date
            '1': 'lv077', // Bid docs close date
            '2': 'lv078', // Bid close date
            '3': 'lv074', // Est. Delivery date
            '4': 'lv101'  // Completion date
        };
        const dateField = dateFields[datetype] || 'lv003';

        const periods = generatePeriods(type, vals);

        // Lookup dictionaries
        const statusMap = {};
        lookups.statuses.forEach(i => { statusMap[i.id] = i.name; });

        const typeMap = {};
        lookups.projectTypes.forEach(i => { typeMap[i.id] = i.name; });

        const progressMap = {};
        lookups.projectProgress.forEach(i => { progressMap[i.id] = i.name; });

        const tvtkMap = {};
        lookups.tvtkCompanies.forEach(i => { tvtkMap[i.id] = i.name; });

        // Initialize buckets
        const dataMap = {};
        periods.forEach(p => {
            dataMap[p.key] = {
                name: p.label,
                total: 0
            };
        });

        const allKeysSet = new Set();

        projects.forEach(proj => {
            const pKey = getProjectPeriodKey(proj, dateField, type);
            if (!pKey || !dataMap[pKey]) return; // Date falls out of selected range

            const projValue = Number(proj.lv102 || 0) / 1000000000; // Value in Billions

            if (chartId === 0) {
                // Biểu đồ 1: Theo loại hình dự án (project type count)
                const catName = typeMap[proj.lv084] || 'Chưa phân loại';
                dataMap[pKey][catName] = (dataMap[pKey][catName] || 0) + 1;
                dataMap[pKey].total += 1;
                allKeysSet.add(catName);
            } else if (chartId === 1) {
                // Biểu đồ 2: Theo tiến độ dự án (project progress count)
                const catName = progressMap[proj.lv008] || 'Chưa phân loại';
                dataMap[pKey][catName] = (dataMap[pKey][catName] || 0) + 1;
                dataMap[pKey].total += 1;
                allKeysSet.add(catName);
            } else if (chartId === 2) {
                // Biểu đồ 3: Theo trạng thái dự án (project status count)
                const catName = statusMap[proj.lv100] || 'Chưa phân loại';
                dataMap[pKey][catName] = (dataMap[pKey][catName] || 0) + 1;
                dataMap[pKey].total += 1;
                allKeysSet.add(catName);
            } else if (chartId === 3) {
                // Biểu đồ 4: Doanh số dự kiến (Project values summed in Billions, stacked by project status)
                const catName = statusMap[proj.lv100] || 'Chưa phân loại';
                dataMap[pKey][catName] = (dataMap[pKey][catName] || 0) + projValue;
                dataMap[pKey].total += projValue;
                allKeysSet.add(catName);
            } else if (chartId === 4) {
                // Biểu đồ 5: Theo Cty TVTK (project count mapped to TVTK companies)
                const companies = proj.tvtk_companies || [];
                if (companies.length === 0) {
                    const catName = 'Chưa có';
                    dataMap[pKey][catName] = (dataMap[pKey][catName] || 0) + 1;
                    dataMap[pKey].total += 1;
                    allKeysSet.add(catName);
                } else {
                    companies.forEach(cid => {
                        const catName = tvtkMap[cid] || 'Khác';
                        dataMap[pKey][catName] = (dataMap[pKey][catName] || 0) + 1;
                        dataMap[pKey].total += 1;
                        allKeysSet.add(catName);
                    });
                }
            }
        });

        const chartData = periods.map(p => dataMap[p.key]);
        return {
            chartData,
            seriesKeys: Array.from(allKeysSet).sort()
        };
    };

    // Calculate aggregated overall values for cards
    const summaryData = useMemo(() => {
        let totalVal = 0;
        projects.forEach(p => {
            totalVal += Number(p.lv102 || 0);
        });
        return {
            totalProjects: projects.length,
            totalSales: totalVal / 1000000000 // Billions VND
        };
    }, [projects]);

    // Helpers to render individual chart cards
    const renderChartCard = (chartId, title, yAxisLabel, isCurrency = false) => {
        const { chartData, seriesKeys } = getChartDataAndKeys(chartId);

        // Check if there is actual data inside the period
        const hasData = chartData.some(d => d.total > 0);

        return (
            <Card
                className="chart-card"
                bordered={false}
                style={{
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                    border: '1px solid #e2e8f0',
                    marginBottom: '24px',
                    background: '#fff'
                }}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1e293b' }}>
                        <BarChart3 size={18} style={{ color: '#197dd3' }} />
                        <span>{title}</span>
                    </div>
                }
            >
                {!hasData ? (
                    <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Không có dữ liệu trong khoảng thời gian đã chọn</span>
                    </div>
                ) : (
                    <div style={{ height: 350, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    label={{
                                        value: yAxisLabel,
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 11 }
                                    }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                        background: '#fff'
                                    }}
                                    formatter={(value, name) => [
                                        isCurrency
                                            ? `${Number(value).toFixed(2)} Tỷ VND`
                                            : `${Number(value).toLocaleString('vi-VN')} DA`,
                                        name
                                    ]}
                                    labelFormatter={(label) => <span style={{ fontWeight: 700, color: '#1e293b' }}>{label}</span>}
                                />
                                <Legend
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                />
                                {seriesKeys.map((key, idx) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        stackId="a"
                                        fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                                        radius={idx === seriesKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Card>
        );
    };

    return (
        <div className={styles.container}>
            {/* Breadcrumbs */}
            <Breadcrumb
                style={{
                    marginBottom: '16px',
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    userSelect: 'none',
                }}
            >
                <Breadcrumb.Item>
                    <Home size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Trang chủ
                </Breadcrumb.Item>
                <Breadcrumb.Item>Quản lý công việc</Breadcrumb.Item>
                <Breadcrumb.Item>Lược đồ kế hoạch</Breadcrumb.Item>
            </Breadcrumb>

            {/* Header Title */}
            <div className={styles.pageTitle}>
                <TrendingUp size={20} style={{ color: '#197dd3' }} />
                Lược Đồ Kinh Doanh &amp; Kế Hoạch
            </div>

            {/* Overview cards */}
            <div style={{ marginBottom: '24px' }}>
                <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                        <Card
                            bordered={false}
                            style={{
                                background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
                                color: '#fff',
                                borderRadius: '16px',
                                boxShadow: '0 10px 25px -5px rgba(29, 78, 216, 0.2)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '13px', opacity: 0.85, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Tổng Số Lượng Dự Án
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px' }}>
                                        {summaryData.totalProjects.toLocaleString('vi-VN')}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '16px', borderRadius: '12px' }}>
                                    <Briefcase size={28} />
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card
                            bordered={false}
                            style={{
                                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                                color: '#fff',
                                borderRadius: '16px',
                                boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.2)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '13px', opacity: 0.85, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Doanh Số Dự Kiến Tích Lũy
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px' }}>
                                        {summaryData.totalSales.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Tỷ VND
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '16px', borderRadius: '12px' }}>
                                    <DollarSign size={28} />
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Filter controls panel */}
            <div className={styles.pageWrapper}>
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFilterSubmit}
                        onValuesChange={handleValuesChange}
                        initialValues={{
                            dstype: 'all',
                            alltype: '0',
                            datetype: '0',
                            dateRange: [dayjs().startOf('month'), dayjs().endOf('month')],
                            monthRange: [dayjs().startOf('year'), dayjs().endOf('year')],
                            quarterRange: [dayjs().startOf('year'), dayjs().endOf('year')],
                            yearRange: [dayjs().subtract(5, 'year'), dayjs()],
                            isShowNVN: false
                        }}
                    >
                        {/* Row 1: Filters */}
                        <Row gutter={[24, 0]}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="dstype" label="Doanh số BC theo">
                                    <Select dropdownMatchSelectWidth={false} style={{ width: '100%' }}>
                                        <Option value="all">Tất cả biểu đồ</Option>
                                        <Option value="0">BIỂU ĐỒ 1: Theo Loại hình dự án</Option>
                                        <Option value="1">BIỂU ĐỒ 2: Theo Tiến độ dự án</Option>
                                        <Option value="2">BIỂU ĐỒ 3: Theo Trạng thái dự án</Option>
                                        <Option value="3">BIỂU ĐỒ 4: Doanh số dự kiến theo Quý</Option>
                                        <Option value="4">BIỂU ĐỒ 5: Theo Cty TVTK</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="alltype" label="Báo cáo theo">
                                    <Select dropdownMatchSelectWidth={false} style={{ width: '100%' }}>
                                        <Option value="0">Hàng ngày</Option>
                                        <Option value="1">Hàng tháng</Option>
                                        <Option value="3">Hàng quý</Option>
                                        <Option value="2">Hàng năm</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="datetype" label="Chọn ngày báo cáo">
                                    <Select dropdownMatchSelectWidth={false} style={{ width: '100%' }}>
                                        <Option value="0">Ngày tạo</Option>
                                        <Option value="1">Ngày đóng hồ sơ thầu</Option>
                                        <Option value="2">Ngày đóng thầu</Option>
                                        <Option value="3">Thời gian dự kiến cấp hàng</Option>
                                        <Option value="4">Thời gian hoàn thành dự án</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                {/* Date Range Picker according to period selection */}
                                {alltype === '0' && (
                                    <Form.Item name="dateRange" label="Chọn thời gian">
                                        <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowClear={false} />
                                    </Form.Item>
                                )}
                                {alltype === '1' && (
                                    <Form.Item name="monthRange" label="Chọn thời gian">
                                        <DatePicker.RangePicker style={{ width: '100%' }} picker="month" format="MM/YYYY" allowClear={false} />
                                    </Form.Item>
                                )}
                                {alltype === '3' && (
                                    <Form.Item name="quarterRange" label="Chọn thời gian">
                                        <DatePicker.RangePicker style={{ width: '100%' }} picker="quarter" format="[Quý] Q/YYYY" allowClear={false} />
                                    </Form.Item>
                                )}
                                {alltype === '2' && (
                                    <Form.Item name="yearRange" label="Chọn thời gian">
                                        <DatePicker.RangePicker style={{ width: '100%' }} picker="year" format="YYYY" allowClear={false} />
                                    </Form.Item>
                                )}
                            </Col>
                        </Row>

                        <Divider style={{ margin: '12px 0 20px', borderColor: '#e2e8f0' }} />

                        {/* Row 2: Advanced Lookup filters */}
                        <Row gutter={[24, 0]}>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item name="lv100" label="Trạng thái dự án">
                                    <Select dropdownMatchSelectWidth={false} mode="multiple" placeholder="-- Tất cả trạng thái --" allowClear style={{ width: '100%' }} optionFilterProp="label">
                                        {lookups.statuses.map(item => (
                                            <Option key={item.id} value={item.id} label={item.name}>{item.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item name="lv085" label="Khu vực">
                                    <Select dropdownMatchSelectWidth={false} mode="multiple" placeholder="-- Tất cả khu vực --" allowClear style={{ width: '100%' }} optionFilterProp="label">
                                        {lookups.regions.map(item => (
                                            <Option key={item.id} value={item.id} label={item.name}>{item.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item name="DoiTuong" label="Đối tượng khách hàng">
                                    <Select dropdownMatchSelectWidth={false} mode="multiple" placeholder="-- Tất cả đối tượng --" allowClear style={{ width: '100%' }} optionFilterProp="label">
                                        {lookups.targets.map(item => (
                                            <Option key={item.id} value={item.id} label={item.name}>{item.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={[24, 0]}>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item name="lv079" label="Nhân viên Sale (Kinh doanh)">
                                    <Select dropdownMatchSelectWidth={false} mode="multiple" placeholder="-- Tất cả Sales --" allowClear style={{ width: '100%' }} optionFilterProp="label">
                                        {salesOptions.map(item => (
                                            <Option key={item.id} value={item.id} label={`${item.name} (${item.dept_name || ''})`}>
                                                {item.name} ({item.id})
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item name="lv080" label="Phòng Thị Trường (PTTT)">
                                    <Select dropdownMatchSelectWidth={false} mode="multiple" placeholder="-- Tất cả PTTT --" allowClear style={{ width: '100%' }} optionFilterProp="label">
                                        {ptttOptions.map(item => (
                                            <Option key={item.id} value={item.id} label={`${item.name} (${item.dept_name || ''})`}>
                                                {item.name} ({item.id})
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                                <Form.Item name="lv081" label="Trợ lý Admin (AD)">
                                    <Select dropdownMatchSelectWidth={false} mode="multiple" placeholder="-- Tất cả AD --" allowClear style={{ width: '100%' }} optionFilterProp="label">
                                        {adOptions.map(item => (
                                            <Option key={item.id} value={item.id} label={`${item.name} (${item.dept_name || ''})`}>
                                                {item.name} ({item.id})
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={[24, 0]} align="middle" style={{ marginTop: '8px' }}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="isShowNVN" valuePropName="checked" style={{ marginBottom: '16px' }}>
                                    <Checkbox>Hiển thị nhân viên nghỉ việc</Checkbox>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} style={{ textAlign: 'right', marginBottom: '16px' }}>
                                <Space>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        icon={<RefreshCw size={14} />}
                                        loading={loading}
                                        style={{ borderRadius: '8px', fontWeight: 600, background: '#197dd3', borderColor: '#197dd3' }}
                                    >
                                        Áp dụng bộ lọc
                                    </Button>
                                    <Button
                                        onClick={handleReset}
                                        disabled={loading}
                                        style={{ borderRadius: '8px' }}
                                    >
                                        Làm mới
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                    </Form>
                </Spin>
            </div>

            {/* Displaying Charts Area */}
            <div style={{ marginTop: '24px' }}>
                <Spin spinning={loading}>
                    {/* Render specific charts or all charts based on dstype */}
                    {(dstype === 'all' || dstype === '0') &&
                        renderChartCard(0, 'BIỂU ĐỒ 1: Theo Loại hình dự án', 'Số lượng dự án')}

                    {(dstype === 'all' || dstype === '1') &&
                        renderChartCard(1, 'BIỂU ĐỒ 2: Theo Tiến độ dự án', 'Số lượng dự án')}

                    {(dstype === 'all' || dstype === '2') &&
                        renderChartCard(2, 'BIỂU ĐỒ 3: Theo Trạng thái dự án', 'Số lượng dự án')}

                    {(dstype === 'all' || dstype === '3') &&
                        renderChartCard(3, 'BIỂU ĐỒ 4: Doanh số dự kiến theo Quý (Tỷ VND)', 'Giá trị doanh số (Tỷ)', true)}

                    {(dstype === 'all' || dstype === '4') &&
                        renderChartCard(4, 'BIỂU ĐỒ 5: Theo Công ty TVTK', 'Số lượng dự án')}
                </Spin>
            </div>
        </div>
    );
};

export default LuocDoKeHoach;
