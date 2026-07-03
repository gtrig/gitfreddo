import type { SVGProps } from 'react'
import {
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  ChevronRightIcon,
  CloudIcon,
  ComputerDesktopIcon,
  FolderIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  Squares2X2Icon,
  TagIcon,
  TicketIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'

type IconProps = SVGProps<SVGSVGElement>

export function SidebarIconLocal(props: IconProps) {
  return <ComputerDesktopIcon aria-hidden {...props} />
}

export function SidebarIconRemote(props: IconProps) {
  return <CloudIcon aria-hidden {...props} />
}

export function SidebarIconStash(props: IconProps) {
  return <ArchiveBoxIcon aria-hidden {...props} />
}

export function SidebarIconWorktree(props: IconProps) {
  return <Squares2X2Icon aria-hidden {...props} />
}

export function SidebarIconTag(props: IconProps) {
  return <TagIcon aria-hidden {...props} />
}

export function SidebarIconBranch(props: IconProps) {
  return <ShareIcon aria-hidden {...props} />
}

export function SidebarIconFolder(props: IconProps) {
  return <FolderIcon aria-hidden {...props} />
}

export function SidebarIconOrigin(props: IconProps) {
  return <GlobeAltIcon aria-hidden {...props} />
}

export function SidebarIconPullRequest(props: IconProps) {
  return <ArrowsRightLeftIcon aria-hidden {...props} />
}

export function SidebarIconIssues(props: IconProps) {
  return <TicketIcon aria-hidden {...props} />
}

export function SidebarIconCheck(props: IconProps) {
  return <CheckIcon aria-hidden {...props} />
}

export function SidebarIconSearch(props: IconProps) {
  return <MagnifyingGlassIcon aria-hidden {...props} />
}

export function SidebarIconChevron({ open, className, ...props }: IconProps & { open: boolean }) {
  return (
    <ChevronRightIcon
      aria-hidden
      className={`transition-transform ${open ? 'rotate-90' : ''} ${className ?? ''}`}
      {...props}
    />
  )
}
