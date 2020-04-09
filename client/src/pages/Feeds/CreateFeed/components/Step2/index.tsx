import React, { useContext } from 'react'
import { Form, Button, Descriptions, Divider, Modal } from 'antd'
import styles from './index.less'
import TextArea from 'antd/lib/input/TextArea'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import StepContext from '../../StepContext'

const formItemLayout = {
	labelCol: {
		span: 5,
	},
	wrapperCol: {
		span: 19,
	},
}

const Step2: React.FC = (props: any) => {
	const [form] = Form.useForm()
	const { createTitleForm, readableCategoryValue, firstEntryForm } = useContext(StepContext)

	const { stepMovementTo, setFirstEntryForm, setIsRequestReady } = props

	const onPrev = (): void => {
		setFirstEntryForm((state: any) => ({...state, text: form.getFieldValue('entry') }))
		stepMovementTo('main')
	}

	const onValidateForm = async () => {
		if (!form.getFieldValue('entry')) return

		setFirstEntryForm({
			text: form.getFieldValue('entry')
		})
		setIsRequestReady(true)
	}

	const confirmationModal = (): void => {
		if (!form.getFieldValue('entry')) return
		Modal.confirm({
			centered: true,
			title: 'You are about to post this feed. Are you sure ?',
			icon: <ExclamationCircleOutlined />,
			okText: 'Yes',
			cancelText: 'No',
			onOk() {
				onValidateForm()
			},
		})
	}

	return (
		<Form {...formItemLayout} form={form} initialValues={{ entry: firstEntryForm.text }} layout="horizontal" className={styles.stepForm}>
			<Descriptions column={1}>
				<Descriptions.Item label="Category">
					{ readableCategoryValue }
				</Descriptions.Item>
				<Descriptions.Item label="Title">
					{ createTitleForm.name }
				</Descriptions.Item>
				<Descriptions.Item label="Description">
					{ createTitleForm.description }
				</Descriptions.Item>
			</Descriptions>
			<Divider style={{ margin: '24px 0' }} />
			<Form.Item rules={[{ required: true, message: 'Please fill the input above' }]} label="Entry" name="entry">
				<TextArea allowClear autoSize={{ minRows: 4 }} />
			</Form.Item>
			<Form.Item
				style={{ marginBottom: 8 }}
				wrapperCol={{
					xs: { span: 24, offset: 0 },
					sm: {
						span: formItemLayout.wrapperCol.span,
						offset: formItemLayout.labelCol.span,
					},
				}}
			>
				<Button type="primary" htmlType="submit" onClick={confirmationModal}>
					Post
				</Button>
				<Button onClick={onPrev} style={{ marginLeft: 8 }}>
					Previous Step
				</Button>
			</Form.Item>
			{confirmationModal}
		</Form>
	)
}
export default Step2