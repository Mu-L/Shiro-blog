import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { OwnerStatus as TOwnerStatus } from '~/atoms/status'
import type { FormContextType, FormFieldBaseProps } from '~/components/ui/form'
import type { DetailedHTMLProps, InputHTMLAttributes } from 'react'

import { useIsLogged } from '~/atoms/hooks'
import { setOwnerStatus, useOwnerStatus } from '~/atoms/hooks/status'
import { StyledButton } from '~/components/ui/button'
import { FloatPopover } from '~/components/ui/float-popover'
import { Form, FormInput } from '~/components/ui/form'
import { useCurrentModal, useModalStack } from '~/components/ui/modal'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import { apiClient } from '~/lib/request.new'
import { toast } from '~/lib/toast'

export const OwnerStatus = () => {
  const pageIsActive = usePageIsActive()
  const { data: statusFromRequest, isLoading: statusLoading } = useQuery({
    queryKey: ['shiro-status'],
    queryFn: () => apiClient.proxy.fn.shiro.status.get<TOwnerStatus | null>(),
    refetchInterval: 1000 * 60,
    refetchOnMount: 'always',
    enabled: pageIsActive,
  })

  useEffect(() => {
    if (statusLoading) return
    if (!statusFromRequest) {
      setOwnerStatus(null)
    } else setOwnerStatus({ ...statusFromRequest })
  }, [statusFromRequest, statusLoading])

  const ownerStatus = useOwnerStatus()
  const isLogged = useIsLogged()

  const [mouseEnter, setMouseEnter] = useState(false)
  const { present } = useModalStack()
  const triggerElement = (
    <div
      role={isLogged ? 'button' : 'img'}
      tabIndex={isLogged ? 0 : -1}
      onMouseEnter={() => {
        setMouseEnter(true)
      }}
      onMouseLeave={() => {
        setMouseEnter(false)
      }}
      onClick={
        isLogged
          ? () => {
              present({
                title: '设置状态',
                content: SettingStatusModalContent,
              })
            }
          : undefined
      }
      className={clsx(
        'pointer-events-auto absolute bottom-0 right-0 z-10 flex size-4 cursor-default items-center justify-center rounded-full text-accent duration-200',
        isLogged && mouseEnter && !ownerStatus
          ? 'size-6 rounded-full bg-base-100'
          : '',
        isLogged && mouseEnter && 'cursor-pointer',
      )}
    >
      {isLogged && mouseEnter ? (
        <i className="icon-[mingcute--emoji-line]" />
      ) : (
        ownerStatus?.emoji
      )}
    </div>
  )

  if (!isLogged && !ownerStatus) return null
  return (
    <FloatPopover asChild triggerElement={triggerElement} type="tooltip">
      <div className="flex flex-col gap-1 text-lg">
        {ownerStatus && (
          <>
            <p className="font-bold">
              现在的状态：{ownerStatus?.emoji} {ownerStatus?.desc}
            </p>
            {!!ownerStatus.untilAt && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                持续到 {new Date(ownerStatus.untilAt).toLocaleTimeString()}
              </p>
            )}
          </>
        )}

        {!ownerStatus && isLogged && <p>点击设置状态</p>}
      </div>
    </FloatPopover>
  )
}

const SettingStatusModalContent = () => {
  const [inputs] = useState(
    () =>
      [
        {
          name: 'emoji',
          placeholder: 'Emoji *',
          rules: [
            {
              validator: (value: string) => !!value,
              message: 'Emoji 不能为空',
            },
            // {
            //   validator: (value: string) => value.length <= 20,
            //   message: 'Emoji 不能超过 1 个字符',
            // },
          ],
        },
        {
          name: 'desc',
          placeholder: '状态描述 *',
          rules: [
            {
              validator: (value: string) => !!value,
              message: '状态描述不能为空',
            },
          ],
        },
        {
          name: 'ttl',
          placeholder: '持续时间',
          type: 'number',
          rules: [
            {
              validator: (value: string) => !isNaN(Number(value)),
              message: '持续时间必须是数字',
            },
          ],
          transform(value) {
            return +value
          },
        },
      ] as (DetailedHTMLProps<
        InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      > &
        FormFieldBaseProps<string>)[],
  )
  const formRef = useRef<FormContextType>(null)
  const { dismiss } = useCurrentModal()
  const [isLoading, setIsLoading] = useState(false)
  const handleSubmit = useCallback(async () => {
    if (!formRef.current) return
    const currentValues = formRef.current.getCurrentValues()
    setIsLoading(true)
    await apiClient.serverless.proxy.shiro.status
      .post({
        data: currentValues,
      })
      .finally(() => {
        setIsLoading(false)
      })
    toast.success('设置成功')

    dismiss()
  }, [dismiss])
  const handleReset = useCallback(async () => {
    setIsLoading(true)
    await apiClient.serverless.proxy.shiro.status.delete().finally(() => {
      setIsLoading(false)
    })
    toast.success('设置成功')

    dismiss()
  }, [dismiss])

  return (
    <Form ref={formRef} className="flex flex-col gap-2" onSubmit={handleSubmit}>
      {inputs.map((input) => (
        <FormInput key={input.name} {...input} />
      ))}

      <div className="flex w-full gap-2 center">
        <StyledButton
          className="rounded-md"
          isLoading={isLoading}
          onClick={handleReset}
          variant="secondary"
        >
          重置
        </StyledButton>
        <StyledButton isLoading={isLoading} variant="primary" type="submit">
          提交
        </StyledButton>
      </div>
    </Form>
  )
}
