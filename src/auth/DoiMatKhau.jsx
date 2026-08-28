import React from 'react';
import { Form, Input, Button, Card, Row, Col, Typography, message, Steps } from 'antd';
import { Lock, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { Step } = Steps;

const DoiMatKhau = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const { user, changePassword } = useAuth();

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      message.success('Đổi mật khẩu thành công!');
      setCurrentStep(2);
      form.resetFields();
    } catch (error) {
      message.error('Đổi mật khẩu thất bại! Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordConfirm = ({ getFieldValue }) => ({
    validator(_, value) {
      if (!value || getFieldValue('newPassword') === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
    },
  });

  const steps = [
    {
      title: 'Xác thực',
      description: 'Nhập mật khẩu hiện tại',
    },
    {
      title: 'Mật khẩu mới',
      description: 'Nhập mật khẩu mới',
    },
    {
      title: 'Hoàn thành',
      description: 'Đổi mật khẩu thành công',
    },
  ];

  return (
    <div className="doi-mat-khau-container">
      <Row justify="center">
        <Col xs={24} sm={20} md={16} lg={12} xl={10}>
          <Card>
            <div className="header-section">
              <Title level={3}>
                <Lock size={18} style={{ marginRight: 8 }} /> Đổi mật khẩu
              </Title>
              <Text type="secondary">
                Tài khoản: <strong>{user?.username}</strong>
              </Text>
            </div>

            <Steps current={currentStep} className="steps-section">
              {steps.map((step, index) => (
                <Step
                  key={index}
                  title={step.title}
                  description={step.description}
                  icon={currentStep === 2 && index === 2 ? <CheckCircleOutlined /> : undefined}
                />
              ))}
            </Steps>

            {currentStep < 2 && (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleChangePassword}
                className="doi-mat-khau-form"
              >
                <Form.Item
                  label="Mật khẩu hiện tại"
                  name="currentPassword"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }
                  ]}
                >
                  <Input.Password
                    prefix={<Shield size={16} />}
                    placeholder="Nhập mật khẩu hiện tại"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="Mật khẩu mới"
                  name="newPassword"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                    {
                      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
                      message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số!'
                    }
                  ]}
                >
                  <Input.Password
                    prefix={<Lock size={16} />}
                    placeholder="Nhập mật khẩu mới"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="Xác nhận mật khẩu mới"
                  name="confirmPassword"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
                    validatePasswordConfirm
                  ]}
                >
                  <Input.Password
                    prefix={<Lock size={16} />}
                    placeholder="Nhập lại mật khẩu mới"
                    size="large"
                  />
                </Form.Item>

                <div className="password-rules">
                  <Text type="secondary">
                    <strong>Yêu cầu mật khẩu:</strong>
                  </Text>
                  <ul>
                    <li>Ít nhất 6 ký tự</li>
                    <li>Ít nhất 1 chữ hoa (A-Z)</li>
                    <li>Ít nhất 1 chữ thường (a-z)</li>
                    <li>Ít nhất 1 chữ số (0-9)</li>
                  </ul>
                </div>

                <Form.Item>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Button block onClick={() => form.resetFields()}>
                        Đặt lại
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                      >
                        Đổi mật khẩu
                      </Button>
                    </Col>
                  </Row>
                </Form.Item>
              </Form>
            )}

            {currentStep === 2 && (
              <div className="success-section">
                <CheckCircle size={48} color="#52c41a" />
                <Title level={4}>Đổi mật khẩu thành công!</Title>
                <Text>
                  Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại với mật khẩu mới.
                </Text>
                <Button 
                  type="primary" 
                  onClick={() => setCurrentStep(0)}
                  style={{ marginTop: 16 }}
                >
                  Đổi mật khẩu lần nữa
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DoiMatKhau;
