import { ReactNode } from 'react'

// A template remounts on every navigation, which replays the entrance.
export default function StoreTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>
}
