/// <reference types="vite/client" />

declare module '*.jsx' {
  import { FC } from 'react'
  const content: FC
  export default content
}
