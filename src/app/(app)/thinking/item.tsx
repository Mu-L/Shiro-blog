'use client'

import { useQueryClient } from '@tanstack/react-query'
import { memo, useMemo } from 'react'
import clsx from 'clsx'
import { produce } from 'immer'
import type { RecentlyModel } from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'
import type { FC } from 'react'

import {
  RecentlyAttitudeEnum,
  RecentlyAttitudeResultEnum,
} from '@mx-space/api-client'

import { useIsLogged } from '~/atoms/hooks'
import { CommentBoxRootLazy, CommentsLazy } from '~/components/modules/comment'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { StyledButton } from '~/components/ui/button'
import { Divider } from '~/components/ui/divider'
import { Markdown } from '~/components/ui/markdown'
import { useModalStack } from '~/components/ui/modal'
import { RelativeTime } from '~/components/ui/relative-time'
import { sample } from '~/lib/lodash'
import { apiClient } from '~/lib/request'
import { toast } from '~/lib/toast'
import { urlBuilder } from '~/lib/url-builder'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { QUERY_KEY } from './constants'

export const ThinkingItem: FC<{
  item: RecentlyModel
}> = memo(({ item }) => {
  const owner = useAggregationSelector((a) => a.user)!

  const handleUp = (id: string) => {
    apiClient.recently
      .attitude(id, RecentlyAttitudeEnum.Up)
      .then(({ code }) => {
        if (code === RecentlyAttitudeResultEnum.Inc) {
          toast.success(sample(['(￣▽￣*) ゞ', '(＾▽＾)']))
        } else {
          toast.success('[○･｀Д´･○]')
        }
      })
  }

  const handleDown = (id: string) => {
    apiClient.recently
      .attitude(id, RecentlyAttitudeEnum.Down)
      .then(({ code }) => {
        if (code === RecentlyAttitudeResultEnum.Inc) {
          toast.success('(╥_╥)')
        } else {
          toast.success('ヽ (・∀・) ﾉ')
        }
      })
  }

  const { present } = useModalStack()
  return (
    <li
      key={item.id}
      className="mb-8 mt-[50px] grid grid-cols-[40px_auto] flex-col gap-4 space-y-2"
    >
      <div className="translate-y-6">
        <img
          src={owner.avatar}
          className="size-[40px] rounded-full ring-2 ring-slate-200 dark:ring-zinc-800"
        />
      </div>
      <div className="min-w-0 max-w-full">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-medium">{owner.name}</span>

          <span className="text-xs opacity-80">
            <RelativeTime date={item.created} />
          </span>
        </div>

        <div className="relative w-full min-w-0">
          <div
            className={clsx(
              'relative inline-block rounded-xl p-3 text-zinc-800 dark:text-zinc-200',
              'rounded-tl-sm bg-zinc-600/5 dark:bg-zinc-500/20',
              'max-w-full overflow-auto',
            )}
          >
            <Markdown>{item.content}</Markdown>

            {!!item.ref && (
              <div>
                <RefPreview refModel={item.ref} />
              </div>
            )}
          </div>
        </div>

        <div
          className={clsx(
            'mt-4 space-x-8 opacity-50 duration-200 hover:opacity-100',
            '[&_button:hover]:text-accent [&_button]:inline-flex [&_button]:space-x-1 [&_button]:text-sm [&_button]:center',
            '[&_button]:-my-5 [&_button]:-ml-5 [&_button]:p-5',
          )}
        >
          <button
            onClick={() => {
              present({
                title: '评论',
                content: () => <CommentModal {...item} />,
              })
            }}
          >
            <i className="icon-[mingcute--comment-line]" />

            <span className="sr-only">评论</span>
            <span>
              {/* @ts-expect-error */}
              {item.comments}
            </span>
          </button>

          <button
            onClick={() => {
              handleUp(item.id)
            }}
          >
            <i className="icon-[mingcute--heart-line]" />
            <span className="sr-only">喜欢</span>
            <span>{item.up}</span>
          </button>

          <button
            onClick={() => {
              handleDown(item.id)
            }}
          >
            <i className="icon-[mingcute--heart-crack-line]" />
            <span className="sr-only">不喜欢</span>
            <span>{item.down}</span>
          </button>

          <DeleteButton id={item.id} />
        </div>
      </div>
    </li>
  )
})

ThinkingItem.displayName = 'ThinkingItem'

const RefPreview: FC<{ refModel: any }> = (props) => {
  const title = props.refModel?.title

  const url = useMemo(() => {
    return urlBuilder.build(props.refModel)
  }, [props.refModel])

  if (!title) {
    return null
  }

  return (
    <>
      <Divider className="my-4 w-12 bg-current opacity-50" />
      <p className="flex items-center space-x-2 opacity-80">
        发表于： <i className="icon-[mingcute--link-3-line]" />
        <PeekLink href={url} className="shiro-link--underline">
          {title}
        </PeekLink>
      </p>
    </>
  )
}

const DeleteButton = (props: { id: string }) => {
  const isLogin = useIsLogged()
  const queryClient = useQueryClient()

  const handleDelete = () => {
    apiClient.shorthand
      .proxy(props.id)
      .delete()
      .then(() => {
        toast.success('删除成功')

        queryClient.setQueryData<InfiniteData<RecentlyModel[]>>(
          QUERY_KEY,
          (old) => {
            return produce(old, (draft) => {
              draft?.pages.forEach((page) => {
                page.forEach((item, index) => {
                  if (item.id === props.id) {
                    page.splice(index, 1)
                  }
                })
              })
            })
          },
        )
      })
  }
  const { present } = useModalStack()
  if (!isLogin) return null

  return (
    <button
      className="text-red-500 hover:text-red-600 dark:hover:text-red-300"
      onClick={() => {
        present({
          title: '确定删除',
          content: ({ dismiss }) => (
            <div className="w-[300px] space-y-4">
              <div className="mt-4 flex justify-end space-x-4">
                <StyledButton
                  variant="primary"
                  onClick={() => {
                    handleDelete()
                    dismiss()
                  }}
                  className="bg-zinc-100/80 !text-red-500 dark:bg-neutral-900/90"
                >
                  确定
                </StyledButton>
                <StyledButton variant="primary" onClick={dismiss}>
                  取消
                </StyledButton>
              </div>
            </div>
          ),
        })
      }}
    >
      <i className="icon-[mingcute--delete-line]" />
      <span className="sr-only">删除</span>
    </button>
  )
}

const CommentModal = (props: RecentlyModel) => {
  const { id, allowComment, content } = props

  return (
    <div className="max-w-[95vw] overflow-y-auto overflow-x-hidden md:w-[500px] lg:w-[600px] xl:w-[700px]">
      <span>{allowComment && '回复：'}</span>

      <Markdown className="mt-4" allowsScript>
        {content}
      </Markdown>

      {allowComment && <CommentBoxRootLazy className="my-12" refId={id} />}

      <CommentsLazy refId={id} />
    </div>
  )
}