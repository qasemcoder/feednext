import React from 'react'
import CheckPermissions from './CheckPermissions'

/*
 * default is "NULL"
 */
const Exception403 = (): number => 403

export const isComponentClass = (component: React.ComponentClass | React.ReactNode): boolean => {
	if (!component) return false
	const proto = Object.getPrototypeOf(component)
	if (proto === React.Component || proto === Function.prototype) return true
	return isComponentClass(proto)
}

// Determine whether the incoming component has been instantiated
// AuthorizedRoute is already instantiated
// Authorized  render is already instantiated, children is no instantiated
// Secured is not instantiated
const checkIsInstantiation = (target: React.ComponentClass | React.ReactNode): any => {
	if (isComponentClass(target)) {
		const Target = target as React.ComponentClass
		// eslint-disable-next-line react/display-name
		return (props: any): any => <Target {...props} />
	}
	if (React.isValidElement(target)) {
		return (props: any): any => React.cloneElement(target, props)
	}
	return (): string | number | boolean | {} | React.ReactNodeArray | React.ComponentClass<{}, any> | null | undefined =>
		target
}

/**
 * 用于判断是否拥有权限访问此 view 权限
 * authority 支持传入 string, () => boolean | Promise
 * e.g. 'user' 只有 user 用户能访问
 * e.g. 'user,admin' user 和 admin 都能访问
 * e.g. ()=>boolean 返回true能访问,返回false不能访问
 * e.g. Promise  then 能访问   catch不能访问
 * e.g. authority support incoming string, () => boolean | Promise
 * e.g. 'user' only user user can access
 * e.g. 'user, admin' user and admin can access
 * e.g. () => boolean true to be able to visit, return false can not be accessed
 * e.g. Promise then can not access the visit to catch
 * @param {string | function | Promise} authority
 * @param {ReactNode} error 非必需参数
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authorize = (authority: string, error?: React.ReactNode): any => {
	/**
	 * conversion into a class
	 * 防止传入字符串时找不到staticContext造成报错
	 * String parameters can cause staticContext not found error
	 */
	let classError: boolean | React.FunctionComponent = false
	if (error) {
		classError = (() => error) as React.FunctionComponent
	}
	if (!authority) {
		throw new Error('authority is required')
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function decideAuthority(target: React.ComponentClass | React.ReactNode): any {
		const component = CheckPermissions(authority, target, classError || Exception403)
		return checkIsInstantiation(component)
	}
}

export default authorize