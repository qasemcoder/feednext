import React, { useEffect, useState } from 'react'
import { Form } from '@ant-design/compatible'
import { Button, Card, List, Select, Tag, message } from 'antd'
import {
	LoadingOutlined,
	ArrowUpOutlined,
	LinkOutlined,
} from '@ant-design/icons'
import '@ant-design/compatible/assets/index.css'

import ArticleListContent from './components/ArticleListContent'
import StandardFormRow from './components/StandardFormRow'
import TagSelect from './components/TagSelect'
import styles from './style.less'
import api from '@/utils/api'

const Feeds = () => {
	const [isLoading, setIsLoading] = useState(true)
	const [feedList, setFeed]: any = useState([])

	const { Option } = Select
	const FormItem = Form.Item

	useEffect(() => {
		api.fetchAllFeeds()
			.then(async feedsResponse => {
				await feedsResponse.data.attributes.titles.map(async (title: any) => {
					await api
						.fetchFeaturedEntryByTitleId(title.id)
						.then(async featuredEntryResponse => {
							const feed = {
								id: title.id,
								name: title.name,
								categoryName: await api
									.fetchOneCategoryById(title.category_id)
									.then(categoryResponse => categoryResponse.data.attributes.name),
								rate: title.rate,
								createdAt: title.created_at,
								updatedAt: title.updated_at,
								entryCount: title.entry_count,
								entry: {
									id: featuredEntryResponse.data.attributes.id,
									avatar: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png',
									profileUrl: '#',
									text: featuredEntryResponse.data.attributes.text,
									createdAt: featuredEntryResponse.data.attributes.created_at,
									updatedAt: featuredEntryResponse.data.attributes.updated_at,
									votes: featuredEntryResponse.data.attributes.votes,
									writtenBy: featuredEntryResponse.data.attributes.written_by,
								},
							}
							await setFeed((feedList: any) => [...feedList, feed])
						})
						.catch(error => message.error(error.response.data.message, 3))
				})
			})
			.then(() => {
				setIsLoading(false)
			})
			.catch(error => message.error(error.response.data.message, 3))
	}, [])

	const owners = [
		{
			id: 'tr',
			name: 'Türkçe',
		},
		{
			id: 'en',
			name: 'English',
		},
	]

	const handleFetchMore = (): void => {
		// TODO
		return
	}

	const IconText: React.FC<{
		type: string
		text: React.ReactNode
	}> = ({ type, text }) => {
		switch (type) {
			case 'link':
				return (
					<span>
						<LinkOutlined
							style={{
								marginRight: 8,
							}}
						/>
						{text}
					</span>
				)
			case 'up':
				return (
					<span>
						<ArrowUpOutlined
							style={{
								marginRight: 8,
							}}
						/>
						{text}
					</span>
				)
			default:
				return null
		}
	}

	const loadMore = feedList.length > 0 && (
		<div
			style={{
				textAlign: 'center',
				marginTop: 16,
			}}
		>
			<Button
				onClick={handleFetchMore}
				style={{
					paddingLeft: 48,
					paddingRight: 48,
				}}
			>
				{isLoading ? (
					<span>
						<LoadingOutlined /> Loading...
					</span>
				) : (
					'load more'
				)}
			</Button>
		</div>
	)

	return (
		<>
			<Card bordered={false}>
				<Form layout="inline">
					<StandardFormRow
						title="Category"
						block
						style={{
							paddingBottom: 11,
						}}
					>
						<FormItem>
							<TagSelect expandable>
								<TagSelect.Option value="cat1">Category one</TagSelect.Option>
								<TagSelect.Option value="cat2">Category two</TagSelect.Option>
								<TagSelect.Option value="cat3">Category three</TagSelect.Option>
								<TagSelect.Option value="cat4">Category four</TagSelect.Option>
								<TagSelect.Option value="cat5">Category five</TagSelect.Option>
								<TagSelect.Option value="cat6">Category six</TagSelect.Option>
							</TagSelect>
						</FormItem>
					</StandardFormRow>
					<StandardFormRow title="Language" grid>
						<Select
							mode="multiple"
							style={{
								maxWidth: 286,
								width: '100%',
							}}
							placeholder="Language Filter"
						>
							{owners.map(owner => (
								<Option key={owner.id} value={owner.id}>
									{owner.name}
								</Option>
							))}
						</Select>
					</StandardFormRow>
				</Form>
			</Card>
			<Card
				style={{
					marginTop: 24,
				}}
				bordered={false}
				bodyStyle={{
					padding: '8px 32px 32px 32px',
				}}
			>
				<List<any>
					size="large"
					loading={feedList.length === 0 ? isLoading : false}
					rowKey="id"
					itemLayout="vertical"
					loadMore={loadMore}
					dataSource={feedList}
					renderItem={(item): JSX.Element => (
						<List.Item
							key={item.id}
							actions={[
								<IconText key="up" type="up" text={item.entry.votes} />,
								<IconText key="link" type="link" text="Share" />,
							]}
							extra={<div className={styles.listItemExtra} />}
						>
							<List.Item.Meta
								title={
									<a className={styles.listItemMetaTitle} href={item.href}>
										{item.name}
									</a>
								}
								description={
									<span>
										<Tag>{item.categoryName}</Tag>
									</span>
								}
							/>
							<ArticleListContent data={item.entry} />
						</List.Item>
					)}
				/>
			</Card>
		</>
	)
}

export default Feeds