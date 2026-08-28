import React from 'react';
import { Form, Input, Button, Card, Row, Col, Typography, message, Steps, Result } from 'antd';
import { Mail, Shield, Lock, CheckCircle } from 'lucide-react';

const { Title, Text } = Typography;
const { Step } = Steps;

const QuenMatKhau = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [resetCode, setResetCode] = React.useState('');

  const handleSendResetCode = async (values) => {
    setLoading(true);
    try {
      // TODO: Implement send reset code API
  // Silent dev log
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEmail(values.email);
      setCurrentStep(1);
      message.success('Mã xác thực đã được gửi đến email của bạn!');
    } catch (error) {
      message.error('Không thể gửi mã xác thực! Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (values) => {
    setLoading(true);
    try {
      // TODO: Implement verify code API
  // Silent dev log
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResetCode(values.resetCode);
      setCurrentStep(2);
      message.success('Mã xác thực hợp lệ!');
    } catch (error) {
      message.error('Mã xác thực không hợp lệ! Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values) => {
    setLoading(true);
    try {
      // TODO: Implement reset password API
      // Silent dev log
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setCurrentStep(3);
      message.success('Đặt lại mật khẩu thành công!');
    } catch (error) {
      message.error('Không thể đặt lại mật khẩu! Vui lòng thử lại.');
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
      title: 'Nhập Email',
      description: 'Nhập email đăng ký',
    },
    {
      title: 'Xác thực',
      description: 'Nhập mã xác thực',
    },
    {
      title: 'Mật khẩu mới',
      description: 'Đặt mật khẩu mới',
    },
    {
      title: 'Hoàn thành',
      description: 'Đặt lại thành công',
    },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSendResetCode}
          >
            <Form.Item
              label="Email đăng ký"
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
                { type: 'email', message: 'Email không hợp lệ!' }
              ]}
            >
              <Input
                prefix={<Mail size={16} />}
                placeholder="Nhập email đăng ký tài khoản"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
              >
                Gửi mã xác thực
              </Button>
            </Form.Item>
          </Form>
        );

      case 1:
        return (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleVerifyCode}
          >
            <Text type="secondary" className="step-description">
              Chúng tôi đã gửi mã xác thực đến email: <strong>{email}</strong>
            </Text>

            <Form.Item
              label="Mã xác thực"
              name="resetCode"
              rules={[
                { required: true, message: 'Vui lòng nhập mã xác thực!' },
                { len: 6, message: 'Mã xác thực phải có 6 ký tự!' }
              ]}
            >
              <Input
                prefix={<Shield size={16} />}
                placeholder="Nhập mã xác thực 6 số"
                size="large"
                maxLength={6}
              />
            </Form.Item>

            <Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Button
                    onClick={() => setCurrentStep(0)}
                    block
                  >
                    Quay lại
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                  >
                    Xác thực
                  </Button>
                </Col>
              </Row>
            </Form.Item>

            <Button 
              type="link" 
              onClick={() => handleSendResetCode({ email })}
              loading={loading}
            >
              Gửi lại mã xác thực
            </Button>
          </Form>
        );

      case 2:
        return (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleResetPassword}
          >
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
                  <Button
                    onClick={() => setCurrentStep(1)}
                    block
                  >
                    Quay lại
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                  >
                    Đặt lại mật khẩu
                  </Button>
                </Col>
              </Row>
            </Form.Item>
          </Form>
        );

      case 3:
        return (
          <Result
            status="success"
            title="Đặt lại mật khẩu thành công!"
            subTitle="Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới."
            extra={[
              <Button type="primary" key="login" href="/login">
                Đăng nhập ngay
              </Button>
            ]}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="quen-mat-khau-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={22} sm={20} md={16} lg={12} xl={10}>
          <Card>
            <div className="header-section">
              <Title level={3}>
                <LockOutlined /> Quên mật khẩu
              </Title>
              <Text type="secondary">
                Đặt lại mật khẩu cho tài khoản của bạn
              </Text>
            </div>

            <Steps current={currentStep} className="steps-section">
              {steps.map((step, index) => (
                <Step
                  key={index}
                  title={step.title}
                  description={step.description}
                />
              ))}
            </Steps>

            <div className="step-content">
              {renderStepContent()}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default QuenMatKhau;
