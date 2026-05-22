// SVG icon set — 20×20 viewBox, 1.5px stroke, rounded caps/joins.
const Icon = ({ d, size = 18, stroke = 'currentColor', fill = 'none', strokeWidth = 1.5, style, ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 20 20"
    fill={fill} stroke={stroke}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
    {...rest}
  >
    {d}
  </svg>
);

export const InboxIcon = (p) => <Icon {...p} d={<><path d="M3 11.5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6.5"/><path d="M3 11.5h4l1.2 2h3.6l1.2-2h4v3.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5Z"/></>} />;
export const ChatIcon = (p) => <Icon {...p} d={<path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v8A1.5 1.5 0 0 1 15.5 14H8l-3.5 3v-3h-.5A1.5 1.5 0 0 1 3.5 12.5v-8Z" transform="translate(.5 0)"/>} />;
export const CalendarIcon = (p) => <Icon {...p} d={<><rect x="3" y="4.5" width="14" height="12.5" rx="1.5"/><path d="M3 8h14"/><path d="M7 3v3M13 3v3"/></>} />;
export const UsersIcon = (p) => <Icon {...p} d={<><circle cx="7.5" cy="7.5" r="2.5"/><path d="M3 16c.4-2.5 2.3-4 4.5-4S11.6 13.5 12 16"/><circle cx="13.5" cy="6.5" r="2"/><path d="M14 12c1.7.2 3 1.5 3.5 4"/></>} />;
export const UserIcon = (p) => <Icon {...p} d={<><circle cx="10" cy="7.5" r="2.7"/><path d="M4.5 16.5c.6-2.8 2.7-4.5 5.5-4.5s4.9 1.7 5.5 4.5"/></>} />;
export const MegaphoneIcon = (p) => <Icon {...p} d={<><path d="M4 8v4a1 1 0 0 0 1 1h2l5 3V4L7 7H5a1 1 0 0 0-1 1Z"/><path d="M14 7c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3"/></>} />;
export const DashboardIcon = (p) => <Icon {...p} d={<><rect x="3" y="3" width="6" height="9" rx="1"/><rect x="3" y="14" width="6" height="3" rx="1"/><rect x="11" y="3" width="6" height="3" rx="1"/><rect x="11" y="8" width="6" height="9" rx="1"/></>} />;
export const SettingsIcon = (p) => <Icon {...p} d={<><circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7"/></>} />;
export const SearchIcon = (p) => <Icon {...p} d={<><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></>} />;
export const SendIcon = (p) => <Icon {...p} d={<path d="M3 10 17 4 11 17l-2-6-6-1Z"/>} />;
export const PaperclipIcon = (p) => <Icon {...p} d={<path d="M14.5 8.5 9 14a3 3 0 0 1-4.2-4.2l6-6a2 2 0 1 1 2.8 2.8L7.7 12.3a1 1 0 1 1-1.4-1.4l5.2-5.2"/>} />;
export const PlusIcon = (p) => <Icon {...p} d={<><path d="M10 4v12M4 10h12"/></>} />;
export const ChevronDownIcon = (p) => <Icon {...p} d={<path d="m5 8 5 5 5-5"/>} />;
export const ChevronRightIcon = (p) => <Icon {...p} d={<path d="m8 5 5 5-5 5"/>} />;
export const ChevronLeftIcon = (p) => <Icon {...p} d={<path d="m12 5-5 5 5 5"/>} />;
export const MoreIcon = (p) => <Icon {...p} d={<><circle cx="5" cy="10" r=".8" fill="currentColor"/><circle cx="10" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/></>} />;
export const StarIcon = (p) => <Icon {...p} d={<path d="m10 3 2.2 4.5 4.8.7-3.5 3.4.9 4.9-4.4-2.3-4.4 2.3.9-4.9L3 8.2l4.8-.7L10 3Z"/>} />;
export const BellIcon = (p) => <Icon {...p} d={<><path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13L5 14Z"/><path d="M8.5 17a1.5 1.5 0 0 0 3 0"/></>} />;
export const FilterIcon = (p) => <Icon {...p} d={<path d="M3 5h14l-5.5 6v5l-3 1.5V11L3 5Z"/>} />;
export const PhoneIcon = (p) => <Icon {...p} d={<path d="M5 3.5h2.5l1.5 4-2 1.2a8 8 0 0 0 4.3 4.3L12.5 11l4 1.5V15a1.5 1.5 0 0 1-1.7 1.5C8.7 16 4 11.3 3.5 5.2A1.5 1.5 0 0 1 5 3.5Z"/>} />;
export const MailIcon = (p) => <Icon {...p} d={<><rect x="3" y="5" width="14" height="10" rx="1.5"/><path d="m3.5 6 6.5 5 6.5-5"/></>} />;
export const SmsIcon = (p) => <Icon {...p} d={<path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v6A1.5 1.5 0 0 1 15.5 13H9l-4 3v-3A1.5 1.5 0 0 1 4.5 11.5l-1.5 0 0-6Z"/>} />;
export const CheckIcon = (p) => <Icon {...p} d={<path d="m4 10 4 4 8-9"/>} />;
export const CheckCircleIcon = (p) => <Icon {...p} d={<><circle cx="10" cy="10" r="7.5"/><path d="m6.5 10 2.5 2.5L14 8"/></>} />;
export const ClockIcon = (p) => <Icon {...p} d={<><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 1.5"/></>} />;
export const SparklesIcon = (p) => <Icon {...p} d={<><path d="M10 3v3M10 14v3M3 10h3M14 10h3M5 5l2 2M13 13l2 2M5 15l2-2M13 7l2-2"/></>} />;
export const BoltIcon = (p) => <Icon {...p} d={<path d="M11 2 4 11h5l-1 7 7-9h-5l1-7Z"/>} />;
export const TagIcon = (p) => <Icon {...p} d={<><path d="M3 3v6l8 8 6-6-8-8H3Z"/><circle cx="6.5" cy="6.5" r=".8" fill="currentColor"/></>} />;
export const ArchiveIcon = (p) => <Icon {...p} d={<><rect x="3" y="4" width="14" height="3" rx="1"/><path d="M4 7v8a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15V7"/><path d="M8 11h4"/></>} />;
export const TrashIcon = (p) => <Icon {...p} d={<><path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5"/><path d="M5 5.5v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 15 15.5v-10"/></>} />;
export const EditIcon = (p) => <Icon {...p} d={<path d="M3 17h3l9-9-3-3-9 9v3ZM12 5l3 3"/>} />;
export const LinkIcon = (p) => <Icon {...p} d={<><path d="M9 11l2-2M7.5 13.5l-2 2a2.5 2.5 0 0 1-3.5-3.5l3-3a2.5 2.5 0 0 1 3.5 0"/><path d="M12.5 6.5l2-2a2.5 2.5 0 0 1 3.5 3.5l-3 3a2.5 2.5 0 0 1-3.5 0"/></>} />;
export const FlagIcon = (p) => <Icon {...p} d={<><path d="M4 3v14"/><path d="M4 4h9l-2 3 2 3H4"/></>} />;

// Avatar with deterministic pastel from name
export function Avatar({ name, size = 36, style }) {
  const initials = (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360;
  const bg = `oklch(0.78 0.06 ${hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: '#1a1410',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: Math.round(size * 0.36), flexShrink: 0,
      letterSpacing: '-0.02em', userSelect: 'none', ...style,
    }}>
      {initials}
    </div>
  );
}

// Channel chip
export function ChannelChip({ channel, size = 12 }) {
  const map = {
    sms:       { bg: '#dbeafe', fg: '#1e40af', Icon: SmsIcon },
    email:     { bg: '#ede9fe', fg: '#5b21b6', Icon: MailIcon },
    voice:     { bg: '#fee2e2', fg: '#991b1b', Icon: PhoneIcon },
    whatsapp:  { bg: '#d1fae5', fg: '#065f46', Icon: ChatIcon },
    chat:      { bg: '#fef3c7', fg: '#92400e', Icon: ChatIcon },
  };
  const c = map[channel] || map.sms;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size + 8, height: size + 8, borderRadius: 4,
      background: c.bg, color: c.fg, flexShrink: 0,
    }}>
      <c.Icon size={size} strokeWidth={1.8} />
    </span>
  );
}
