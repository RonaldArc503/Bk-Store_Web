import { getPresetIconComponent, getResolvedBranding } from '../constants/branding'
import { useSettings } from '../context/SettingsContext'

type AppBrandLogoSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<AppBrandLogoSize, { box: string; icon: string; image: string }> = {
  sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', image: 'w-8 h-8 rounded-lg' },
  md: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5', image: 'w-10 h-10 rounded-xl' },
  lg: { box: 'w-16 h-16 rounded-full', icon: 'w-8 h-8', image: 'w-16 h-16 rounded-full' },
}

interface AppBrandLogoProps {
  size?: AppBrandLogoSize
  withShadow?: boolean
  className?: string
}

export function AppBrandLogo({ size = 'md', withShadow = true, className = '' }: AppBrandLogoProps) {
  const { settings } = useSettings()
  const branding = getResolvedBranding(settings)
  const sizes = sizeClasses[size]
  const boxClass = `${sizes.box} flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-lime-500 to-lime-600 dark:from-lime-600 dark:to-lime-700 ${
    withShadow ? 'shadow-lg' : ''
  } ${className}`

  if (branding.iconMode === 'custom' && branding.customImageUrl) {
    return (
      <img
        src={branding.customImageUrl}
        alt={branding.appName}
        className={`${sizes.image} object-cover flex-shrink-0 ${withShadow ? 'shadow-lg' : ''} ${className}`}
      />
    )
  }

  const Icon = getPresetIconComponent(branding.presetIcon)
  return (
    <div className={boxClass}>
      <Icon className={`${sizes.icon} text-white`} />
    </div>
  )
}

interface AppBrandTextProps {
  showSubtitle?: boolean
  titleClassName?: string
  subtitleClassName?: string
}

export function AppBrandText({
  showSubtitle = true,
  titleClassName = 'font-bold text-gray-900 dark:text-white truncate',
  subtitleClassName = 'text-xs text-gray-500 dark:text-gray-400 truncate',
}: AppBrandTextProps) {
  const { settings } = useSettings()
  const branding = getResolvedBranding(settings)

  return (
    <div className="min-w-0 flex-1">
      <h1 className={titleClassName}>{branding.appName}</h1>
      {showSubtitle && branding.subtitle ? (
        <p className={subtitleClassName}>{branding.subtitle}</p>
      ) : null}
    </div>
  )
}

export function AppBrandMark({
  size = 'md',
  showText = true,
  showSubtitle = true,
  collapsed = false,
  titleClassName,
  subtitleClassName,
}: AppBrandLogoProps &
  AppBrandTextProps & {
    showText?: boolean
    collapsed?: boolean
  }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
      <AppBrandLogo size={size} />
      {showText && !collapsed ? (
        <AppBrandText
          showSubtitle={showSubtitle}
          titleClassName={titleClassName}
          subtitleClassName={subtitleClassName}
        />
      ) : null}
    </div>
  )
}
