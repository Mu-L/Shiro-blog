import type { FC } from 'react'

import type { MarkdownToJSX } from '~/components/ui/markdown'
import { Markdown } from '~/components/ui/markdown'

const disabledTypes = [
  'footnote',
  'footnoteReference',

  'htmlComment',
  'htmlSelfClosing',
  'htmlBlock',
] as MarkdownToJSX.RuleName[]

export const CommentMarkdown: FC<{
  children: string
}> = ({ children }) => {
  return (
    <Markdown
      disabledTypes={disabledTypes}
      disableParsingRawHTML
      forceBlock
      value={children}
    />
  )
}
