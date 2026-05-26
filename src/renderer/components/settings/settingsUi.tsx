import type { ComponentProps, ReactNode } from 'react'
import {
  Alert,
  Card,
  Description,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { MODEL_PROVIDER_PRESETS } from '../../../shared/constants/modelProviders'
import type { ModelProviderId } from '../../types/niuvis'
import type { OpenAIApiMode } from '../../../shared/types/openai'
import { useSettingsPortalContainer } from './SettingsPortalContext'
import {
  SETTINGS_DARK_CLASS,
  SETTINGS_DARK_THEME,
  settingsFieldClassName,
  settingsListItemClassName,
  settingsPopoverClassName,
} from './settingsTheme'

interface SettingsSectionProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function SettingsSection({
  title,
  description,
  action,
  children,
  className = '',
}: SettingsSectionProps) {
  return (
    <Card className={`w-full ${className}`} variant="secondary">
      <Card.Header className="flex flex-row items-start justify-between gap-3 space-y-0 pb-0">
        <div className="min-w-0 flex-1">
          <Card.Title className="text-sm font-medium">{title}</Card.Title>
          {description && <Card.Description className="mt-1">{description}</Card.Description>}
        </div>
        {action}
      </Card.Header>
      <Card.Content className="flex flex-col gap-3 pt-3">{children}</Card.Content>
    </Card>
  )
}

interface SettingsTextFieldProps extends Omit<ComponentProps<typeof Input>, 'children'> {
  label: string
  description?: string
}

export function SettingsTextField({ label, description, ...inputProps }: SettingsTextFieldProps) {
  return (
    <TextField className="w-full" fullWidth>
      <Label>{label}</Label>
      <Input className={settingsFieldClassName} fullWidth variant="primary" {...inputProps} />
      {description ? <Description>{description}</Description> : null}
    </TextField>
  )
}

interface SettingsTextAreaFieldProps extends Omit<ComponentProps<typeof TextArea>, 'children'> {
  label: string
  description?: string
}

export function SettingsTextAreaField({
  label,
  description,
  ...textareaProps
}: SettingsTextAreaFieldProps) {
  return (
    <TextField className="w-full" fullWidth>
      <Label>{label}</Label>
      <TextArea
        className={settingsFieldClassName}
        fullWidth
        variant="primary"
        rows={4}
        {...textareaProps}
      />
      {description ? <Description>{description}</Description> : null}
    </TextField>
  )
}

interface SettingsProviderSelectProps {
  value: ModelProviderId
  onChange: (providerId: ModelProviderId) => void
}

export function SettingsProviderSelect({ value, onChange }: SettingsProviderSelectProps) {
  const portalContainer = useSettingsPortalContainer()

  return (
    <Select
      className="w-full"
      variant="primary"
      placeholder="选择模型提供商"
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key != null) {
          onChange(String(key) as ModelProviderId)
        }
      }}
    >
      <Label>模型提供商</Label>
      <Select.Trigger className={settingsFieldClassName}>
        <Select.Value className="text-field-foreground" />
        <Select.Indicator className="text-field-foreground" />
      </Select.Trigger>
      <Select.Popover
        UNSTABLE_portalContainer={portalContainer ?? undefined}
        className={settingsPopoverClassName}
        {...SETTINGS_DARK_THEME}
      >
        <ListBox className="text-foreground">
          {MODEL_PROVIDER_PRESETS.map((preset) => (
            <ListBox.Item
              key={preset.id}
              id={preset.id}
              className={settingsListItemClassName}
              textValue={preset.label}
            >
              {preset.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

const API_MODE_OPTIONS: { id: OpenAIApiMode; label: string; description: string }[] = [
  {
    id: 'chat',
    label: 'Chat Completions',
    description: 'POST /chat/completions（兼容 OpenAI、DeepSeek、Ollama 等）',
  },
  {
    id: 'responses',
    label: 'Responses API',
    description: 'POST /responses（OpenAI 官方新接口，支持 gpt-4.1 / o 系列等）',
  },
]

interface SettingsApiModeSelectProps {
  value: OpenAIApiMode
  onChange: (mode: OpenAIApiMode) => void
}

export function SettingsApiModeSelect({ value, onChange }: SettingsApiModeSelectProps) {
  const portalContainer = useSettingsPortalContainer()

  return (
    <Select
      className="w-full"
      variant="primary"
      placeholder="选择 API 格式"
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key === 'chat' || key === 'responses') {
          onChange(key)
        }
      }}
    >
      <Label>OpenAI SDK 接口格式</Label>
      <Select.Trigger className={settingsFieldClassName}>
        <Select.Value className="text-field-foreground" />
        <Select.Indicator className="text-field-foreground" />
      </Select.Trigger>
      <Select.Popover
        UNSTABLE_portalContainer={portalContainer ?? undefined}
        className={settingsPopoverClassName}
        {...SETTINGS_DARK_THEME}
      >
        <ListBox className="text-foreground">
          {API_MODE_OPTIONS.map((option) => (
            <ListBox.Item
              key={option.id}
              id={option.id}
              className={settingsListItemClassName}
              textValue={option.label}
              description={option.description}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

interface SettingsProfileGroupProps {
  profiles: { id: string; label: string }[]
  activeProfileId: string
  onSelect: (profileId: string) => void
}

export function SettingsProfileGroup({
  profiles,
  activeProfileId,
  onSelect,
}: SettingsProfileGroupProps) {
  return (
    <ToggleButtonGroup
      className={`${SETTINGS_DARK_CLASS} flex w-full flex-wrap gap-0`}
      isDetached
      selectionMode="single"
      selectedKeys={[activeProfileId]}
      onSelectionChange={(keys) => {
        const next = [...keys][0]

        if (next != null) {
          onSelect(String(next))
        }
      }}
    >
      {profiles.map((profile, index) => (
        <span key={profile.id} className="inline-flex items-center">
          {index > 0 ? <ToggleButtonGroup.Separator /> : null}
          <ToggleButton className="max-w-[140px] truncate px-3" id={profile.id}>
            {profile.label}
          </ToggleButton>
        </span>
      ))}
    </ToggleButtonGroup>
  )
}

interface SettingsMessageProps {
  tone: 'error' | 'success' | 'info'
  children: ReactNode
}

export function SettingsMessage({ tone, children }: SettingsMessageProps) {
  const status =
    tone === 'error' ? 'danger' : tone === 'success' ? 'success' : ('default' as const)

  return (
    <Alert status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}
