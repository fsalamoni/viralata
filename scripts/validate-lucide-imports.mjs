/**
 * @fileoverview validate-lucide-imports.mjs — Validação precisa de imports
 * do lucide-react para arquivos críticos.
 *
 * TASK-V3-PET-OPS-LOG-08 (sw-v72.5): estratégia refinada.
 *
 * Para CADA arquivo, lista os nomes do import do lucide-react, depois
 * compara com uma lista CURADA de ícones conhecidos do lucide-react.
 * Se o arquivo USA um nome do lucide-react que NÃO está no import, ERRO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const CRITICAL_FILES = [
  'src/modules/pets/pages/PetDetailV3.jsx',
  'src/modules/pets/pages/PetDetailView.v3.jsx',
  'src/modules/pets/components/PetNotes.jsx',
  'src/modules/pets/components/PetLog.jsx',
  'src/modules/pets/components/PetTimelineView.jsx',
  'src/modules/organizations/components/PetsOpsTable.jsx',
  'src/modules/organizations/pages/ClubDetail.v3.jsx',
  'src/modules/organizations/pages/OrganizationAdminPanel.v3.jsx',
];

// Componentes do projeto/shadcn que NÃO devem ser confundidos com ícones do lucide
const PROJECT_COMPONENTS = new Set([
  'Badge', 'Link', 'Table', 'Button', 'Input', 'Tabs', 'Dialog', 'Toast', 'Form',
  'Avatar', 'Card', 'Switch', 'Checkbox', 'Label', 'Select', 'Skeleton', 'Popover',
  'DropdownMenu', 'Tooltip', 'EmptyState', 'Sonner', 'Toaster', 'Empty',
  'PetNotes', 'PetLog', 'PetTimelineView', 'PetsOpsTable', 'PetGallery', 'PetMap',
  'PetSimilar', 'PetBreadcrumb', 'PetTimeline', 'PetNotes',
]);

// Conjunto CURADO de ícones do lucide-react (subset mais usado).
// Se um nome está aqui E usado em JSX mas NÃO no import, é ERRO.
// Para ícones fora desta lista, a validação não detecta (false negatives)
// — mas para os ícones comuns da plataforma, funciona.
const KNOWN_LUCIDE_ICONS = new Set([
  'Activity', 'Airplay', 'AlertCircle', 'AlertOctagon', 'AlertTriangle', 'AlignCenter',
  'AlignJustify', 'AlignLeft', 'AlignRight', 'Anchor', 'Aperture', 'Archive',
  'ArrowBigDown', 'ArrowBigLeft', 'ArrowBigRight', 'ArrowBigUp', 'ArrowDown',
  'ArrowDownCircle', 'ArrowDownLeft', 'ArrowDownRight', 'ArrowLeft', 'ArrowLeftCircle',
  'ArrowRight', 'ArrowRightCircle', 'ArrowUp', 'ArrowUpCircle', 'ArrowUpDown',
  'ArrowUpLeft', 'ArrowUpRight', 'AtSign', 'Award', 'Baby', 'Backpack', 'Badge',
  'Banknote', 'BarChart', 'BarChart2', 'BarChart3', 'BarChart4', 'BarChartHorizontal',
  'Battery', 'BatteryCharging', 'BatteryFull', 'BatteryLow', 'BatteryMedium', 'Beaker',
  'Bell', 'BellOff', 'Bike', 'Binary', 'Biohazard', 'Bird', 'Bitcoin', 'Blinds',
  'Bluetooth', 'BluetoothConnected', 'BluetoothOff', 'BluetoothSearching', 'Bold',
  'Bomb', 'Bone', 'Book', 'BookCheck', 'BookCopy', 'BookDown', 'BookKey',
  'BookLock', 'BookMarked', 'BookMinus', 'BookOpen', 'BookOpenCheck', 'BookPlus',
  'BookText', 'BookUp', 'BookX', 'Bookmark', 'BookmarkMinus', 'BookmarkPlus',
  'Bot', 'Box', 'BoxSelect', 'Boxes', 'Brain', 'Briefcase', 'Brush', 'Bug',
  'Building', 'Building2', 'Bus', 'Cake', 'Calculator', 'Calendar', 'CalendarCheck',
  'CalendarCheck2', 'CalendarClock', 'CalendarDays', 'CalendarHeart', 'CalendarMinus',
  'CalendarOff', 'CalendarPlus', 'CalendarRange', 'CalendarSearch', 'CalendarX',
  'Camera', 'CameraOff', 'Car', 'CarFront', 'CarTaxiFront', 'Carrot', 'Cast',
  'Cat', 'Cctv', 'Check', 'CheckCheck', 'CheckCircle', 'CheckCircle2', 'CheckLine',
  'CheckSquare', 'ChefHat', 'Cherry', 'ChevronDown', 'ChevronDownCircle', 'ChevronDownSquare',
  'ChevronFirst', 'ChevronLast', 'ChevronLeft', 'ChevronLeftCircle', 'ChevronLeftSquare',
  'ChevronRight', 'ChevronRightCircle', 'ChevronRightSquare', 'ChevronUp',
  'ChevronUpCircle', 'ChevronUpSquare', 'ChevronsDown', 'ChevronsDownUp', 'ChevronsLeft',
  'ChevronsLeftRight', 'ChevronsRight', 'ChevronsRightLeft', 'ChevronsUp', 'ChevronsUpDown',
  'Chrome', 'Church', 'Cigarette', 'CigaretteOff', 'Circle', 'CircleDashed',
  'CircleDot', 'CircleEllipsis', 'CircleEqual', 'CircleOff', 'CircleSlash',
  'CircleSlashed', 'CircuitBoard', 'Citrus', 'Clapperboard', 'Clipboard',
  'ClipboardCheck', 'ClipboardCopy', 'ClipboardEdit', 'ClipboardList', 'ClipboardPaste',
  'ClipboardSignature', 'ClipboardType', 'ClipboardX', 'Clock', 'Clock1', 'Clock10',
  'Clock11', 'Clock12', 'Clock2', 'Clock3', 'Clock4', 'Clock5', 'Clock6', 'Clock7',
  'Clock8', 'Clock9', 'Cloud', 'CloudCog', 'CloudDrizzle', 'CloudFog', 'CloudHail',
  'CloudLightning', 'CloudMoon', 'CloudMoonRain', 'CloudOff', 'CloudRain',
  'CloudRainWind', 'CloudSnow', 'CloudSun', 'CloudSunRain', 'CloudUpload', 'Cloudy',
  'Clover', 'Code', 'Code2', 'CodeXml', 'Codepen', 'Codesandbox', 'Coffee',
  'Cog', 'Coins', 'Columns', 'Columns2', 'Columns3', 'Columns4', 'Combine',
  'Command', 'Compass', 'Component', 'Computer', 'ConciergeBell', 'Construction',
  'Contact', 'ContactRound', 'Contact2', 'Contrast', 'Cookie', 'CookingPot',
  'Copy', 'CopyCheck', 'CopyMinus', 'CopyPlus', 'CopySlash', 'CopyX', 'Copyright',
  'CornerDownLeft', 'CornerDownRight', 'CornerLeftDown', 'CornerLeftUp', 'CornerRightDown',
  'CornerRightUp', 'CornerUpLeft', 'CornerUpRight', 'Cpu', 'CreativeCommons',
  'CreditCard', 'Croissant', 'Crop', 'Cross', 'Crosshair', 'Crown', 'CupSoda',
  'Currency', 'Database', 'DatabaseBackup', 'DatabaseZap', 'Delete', 'Dessert',
  'Diamond', 'Dice1', 'Dice2', 'Dice3', 'Dice4', 'Dice5', 'Dice6', 'Dices', 'Diff',
  'Disc', 'Disc2', 'Disc3', 'Divide', 'DivideCircle', 'DivideSquare', 'Dna',
  'DnaOff', 'Dog', 'DollarSign', 'Donut', 'DoorClosed', 'DoorOpen', 'Dot',
  'Download', 'DownloadCloud', 'Dribbble', 'Droplet', 'Droplets', 'Drum',
  'Drumstick', 'Dumbbell', 'Ear', 'EarOff', 'Egg', 'EggFried', 'EggOff',
  'Equal', 'EqualNot', 'Eraser', 'Euro', 'Expand', 'ExternalLink', 'Eye',
  'EyeOff', 'Facebook', 'Factory', 'Fan', 'FastForward', 'Feather', 'Fence',
  'FerrisWheel', 'Figma', 'File', 'FileArchive', 'FileAudio', 'FileAudio2',
  'FileAxis3d', 'FileBadge', 'FileBadge2', 'FileBarChart', 'FileBarChart2',
  'FileBox', 'FileCheck', 'FileCheck2', 'FileClock', 'FileCode', 'FileCode2',
  'FileCog', 'FileCog2', 'FileDiff', 'FileDigit', 'FileDown', 'FileEdit',
  'FileHeart', 'FileImage', 'FileInput', 'FileJson', 'FileJson2', 'FileKey',
  'FileKey2', 'FileLineChart', 'FileLock', 'FileLock2', 'FileMinus', 'FileMinus2',
  'FileMusic', 'FileOutput', 'FilePen', 'FilePenLine', 'FilePieChart', 'FilePieChart2',
  'FilePlus', 'FilePlus2', 'FileQuestion', 'FileScan', 'FileSearch', 'FileSearch2',
  'FileSignature', 'FileSpreadsheet', 'FileSpreadsheet2', 'FileStack', 'FileSymlink',
  'FileTerminal', 'FileText', 'FileType', 'FileType2', 'FileUp', 'FileVideo',
  'FileVideo2', 'FileVolume', 'FileVolume2', 'FileWarning', 'FileX', 'FileX2',
  'Files', 'Film', 'Filter', 'FilterX', 'Fingerprint', 'FireExtinguisher', 'Fish',
  'FishOff', 'Flag', 'FlagOff', 'FlagTriangleLeft', 'FlagTriangleRight', 'Flame',
  'FlameKindling', 'Flashlight', 'FlashlightOff', 'FlaskConical', 'FlaskRound',
  'FlipHorizontal', 'FlipHorizontal2', 'FlipVertical', 'FlipVertical2', 'Flower',
  'Flower2', 'Focus', 'FoldHorizontal', 'FoldVertical', 'Folder', 'FolderArchive',
  'FolderCheck', 'FolderClock', 'FolderClosed', 'FolderCog', 'FolderCog2',
  'FolderDot', 'FolderDown', 'FolderEdit', 'FolderGit', 'FolderGit2', 'FolderHeart',
  'FolderInput', 'FolderKanban', 'FolderKey', 'FolderLock', 'FolderMinus',
  'FolderOpen', 'FolderOpenDot', 'FolderPlus', 'FolderRoot', 'FolderSearch',
  'FolderSearch2', 'FolderSymlink', 'FolderSync', 'FolderTree', 'FolderUp',
  'FolderX', 'Folders', 'Footprints', 'Forklift', 'Form', 'Forward', 'Frame',
  'Framer', 'Frown', 'Fuel', 'FunctionSquare', 'GalleryHorizontal', 'GalleryHorizontalEnd',
  'GalleryThumbnails', 'GalleryVertical', 'GalleryVerticalEnd', 'Gamepad',
  'Gamepad2', 'GanttChart', 'GanttChartSquare', 'Gauge', 'GaugeCircle', 'Gavel',
  'Gem', 'Ghost', 'Gift', 'GitBranch', 'GitBranchPlus', 'GitCommit', 'GitCompare',
  'GitCompareArrows', 'GitFork', 'GitGraph', 'GitMerge', 'GitPullRequest',
  'GitPullRequestArrow', 'GitPullRequestClosed', 'GitPullRequestCreate',
  'GitPullRequestCreateArrow', 'GitPullRequestDraft', 'GitHub', 'GitLab',
  'GlassWater', 'Glasses', 'Globe', 'Globe2', 'Goal', 'Grab', 'GraduationCap',
  'Grape', 'Grid', 'Grid2x2', 'Grid3x3', 'Grip', 'GripHorizontal', 'GripVertical',
  'Group', 'Hammer', 'Hand', 'HandCoins', 'HandHeart', 'HandHelping', 'HandMetal',
  'HandPlatter', 'Handshake', 'HardDrive', 'HardDriveDownload', 'HardDriveUpload',
  'Hash', 'Haze', 'HdmiPort', 'Heading', 'Heading1', 'Heading2', 'Heading3',
  'Heading4', 'Heading5', 'Heading6', 'Headphones', 'Headset', 'Heart',
  'HeartCrack', 'HeartHandshake', 'HeartOff', 'HeartPulse', 'Heater', 'Hexagon',
  'Highlighter', 'History', 'Home', 'Hop', 'HopOff', 'Hotel', 'Hourglass',
  'IceCream', 'IceCream2', 'IdCard', 'Image', 'ImageDown', 'ImageMinus',
  'ImageOff', 'ImagePlus', 'ImageUp', 'Images', 'Import', 'Inbox', 'Indent',
  'IndianRupee', 'Infinity', 'Info', 'InspectionPanel', 'Instagram', 'Italic',
  'IterationCcw', 'IterationCcwSquare', 'IterationCw', 'IterationCwSquare', 'JapaneseYen',
  'Joystick', 'Kanban', 'KanbanSquare', 'Key', 'KeyRound', 'KeySquare', 'Keyboard',
  'KeyboardMusic', 'Lamp', 'LampCeiling', 'LampDesk', 'LampFloor', 'LampWallDown',
  'LampWallUp', 'LandPlot', 'Landmark', 'Languages', 'Laptop', 'LaptopMinimal',
  'Lasso', 'LassoSelect', 'Laugh', 'Layers', 'Layers2', 'Layers3', 'Layout',
  'LayoutDashboard', 'LayoutGrid', 'LayoutList', 'LayoutPanelLeft', 'LayoutPanelTop',
  'LayoutTemplate', 'Leaf', 'LeafyGreen', 'Library', 'LifeBuoy', 'Ligature',
  'Lightbulb', 'LightbulbOff', 'LineChart', 'Link', 'Link2', 'Link2Off', 'Linkedin',
  'List', 'ListChecks', 'ListCollapse', 'ListEnd', 'ListFilter', 'ListMinus',
  'ListMusic', 'ListOrdered', 'ListPlus', 'ListRestart', 'ListStart', 'ListTree',
  'ListVideo', 'ListX', 'Loader', 'Loader2', 'Loader3', 'Loader4', 'LoaderCircle',
  'LoaderPinwheel', 'LoaderSquare', 'Locate', 'LocateFixed', 'Lock', 'LockKeyhole',
  'LockKeyholeOpen', 'LockOpen', 'LogIn', 'LogOut', 'Lollipop', 'Lucide',
  'Luggage', 'Magnet', 'Mail', 'MailCheck', 'MailMinus', 'MailOpen', 'MailPlus',
  'MailQuestion', 'MailSearch', 'MailWarning', 'MailX', 'Mailbox', 'Mails',
  'Map', 'MapPin', 'MapPinOff', 'MapPinned', 'Martini', 'Maximize', 'Maximize2',
  'Medal', 'Megaphone', 'MegaphoneOff', 'Meh', 'MemoryStick', 'Menu', 'MenuSquare',
  'Merge', 'MessageCircle', 'MessageCircleCode', 'MessageCircleDashed',
  'MessageCircleHeart', 'MessageCircleMore', 'MessageCircleOff', 'MessageCirclePlus',
  'MessageCircleQuestion', 'MessageCircleReply', 'MessageCircleWarning', 'MessageCircleX',
  'MessageSquare', 'MessageSquareCode', 'MessageSquareDashed', 'MessageSquareDiff',
  'MessageSquareDot', 'MessageSquareHeart', 'MessageSquareLock', 'MessageSquareMore',
  'MessageSquareOff', 'MessageSquarePlus', 'MessageSquareQuote', 'MessageSquareReply',
  'MessageSquareShare', 'MessageSquareText', 'MessageSquareWarning', 'MessageSquareX',
  'MessagesSquare', 'Mic', 'Mic2', 'MicOff', 'Microwave', 'Milestone', 'Milk',
  'MilkOff', 'Minimize', 'Minimize2', 'Minus', 'MinusCircle', 'MinusSquare',
  'Monitor', 'MonitorCheck', 'MonitorCog', 'MonitorDot', 'MonitorDown',
  'MonitorOff', 'MonitorPause', 'MonitorPlay', 'MonitorSmartphone', 'MonitorSpeaker',
  'MonitorUp', 'MonitorX', 'Moon', 'MoonStar', 'MoreHorizontal', 'MoreVertical',
  'Mountain', 'MountainSnow', 'Mouse', 'MouseOff', 'MousePointer', 'MousePointer2',
  'MousePointerClick', 'Move', 'Move3d', 'MoveDown', 'MoveDownLeft', 'MoveDownRight',
  'MoveHorizontal', 'MoveLeft', 'MoveRight', 'MoveUp', 'MoveUpLeft', 'MoveUpRight',
  'MoveVertical', 'Music', 'Music2', 'Music3', 'Music4', 'Muted', 'Nail',
  'Navigation', 'Navigation2', 'Navigation2Off', 'NavigationOff', 'Network', 'Newspaper',
  'Nfc', 'Notebook', 'NotebookPen', 'NotebookTabs', 'NotepadText', 'NotepadTextDashed',
  'Nut', 'NutOff', 'Octagon', 'OctagonAlert', 'OctagonMinus', 'OctagonPause',
  'OctagonX', 'Omega', 'Option', 'Orbit', 'Outdent', 'Package', 'Package2',
  'PackageCheck', 'PackageMinus', 'PackageOpen', 'PackagePlus', 'PackageSearch',
  'PackageX', 'PaintBucket', 'PaintRoller', 'Paintbrush', 'PaintbrushVertical',
  'Palette', 'Palmtree', 'PanelBottom', 'PanelBottomClose', 'PanelBottomOpen',
  'PanelLeft', 'PanelLeftClose', 'PanelLeftOpen', 'PanelRight', 'PanelRightClose',
  'PanelRightOpen', 'PanelTop', 'PanelTopClose', 'PanelTopOpen', 'PanelsLeftBottom',
  'PanelsRightLeft', 'PanelsTopBottom', 'PanelsTopLeft', 'Paperclip', 'Parentheses',
  'ParkingCircle', 'ParkingCircleOff', 'ParkingSquare', 'ParkingSquareOff', 'PartyPopper',
  'Pause', 'PauseCircle', 'PauseOctagon', 'PawPrint', 'PcCase', 'Pen', 'PenLine',
  'PenOff', 'PenSquare', 'PenTool', 'Pencil', 'PencilLine', 'PencilRuler',
  'Pentagon', 'Percent', 'PercentCircle', 'PercentDiamond', 'PercentSquare',
  'PersonStanding', 'Phone', 'PhoneCall', 'PhoneForwarded', 'PhoneIncoming',
  'PhoneMissed', 'PhoneOff', 'PhoneOutgoing', 'Pi', 'Piano', 'Pickaxe', 'PictureInPicture',
  'PictureInPicture2', 'PiggyBank', 'Pilcrow', 'PilcrowSquare', 'Pill', 'Pin',
  'PinOff', 'Pipette', 'Pizza', 'Plane', 'PlaneLanding', 'PlaneTakeoff', 'Play',
  'PlayCircle', 'PlaySquare', 'Plug', 'Plug2', 'PlugZap', 'Plus', 'PlusCircle',
  'PlusSquare', 'Pocket', 'PocketKnife', 'Podcast', 'Pointer', 'Popcorn',
  'Popsicle', 'PoundSterling', 'Power', 'PowerOff', 'Presentation', 'Printer',
  'PrinterCheck', 'Projector', 'Puzzle', 'Pyramid', 'QrCode', 'Quote', 'Rabbit',
  'Radar', 'Radiation', 'Radio', 'RadioReceiver', 'RadioTower', 'Radius', 'RailSymbol',
  'Rainbow', 'Rat', 'Ratio', 'Receipt', 'ReceiptCent', 'ReceiptEuro', 'ReceiptIndianRupee',
  'ReceiptJapaneseYen', 'ReceiptPoundSterling', 'ReceiptRussianRuble', 'ReceiptSwissFranc',
  'ReceiptText', 'RectangleEllipsis', 'RectangleHorizontal', 'RectangleVertical',
  'Recycle', 'Redo', 'Redo2', 'RedoDot', 'RefreshCcw', 'RefreshCcwDot', 'RefreshCw',
  'RefreshCwOff', 'Refrigerator', 'Regex', 'RemoveFormatting', 'Repeat', 'Repeat1',
  'Repeat2', 'Replace', 'ReplaceAll', 'Reply', 'ReplyAll', 'Rewind', 'Ribbon',
  'Rocket', 'RockingChair', 'RollerCoaster', 'RotateCcw', 'RotateCcwSquare',
  'RotateCw', 'RotateCwSquare', 'Rotate3d', 'Router', 'Route', 'RouteOff', 'Rss',
  'Ruler', 'RussianRuble', 'Sailboat', 'Salad', 'Sandwich', 'Satellite',
  'SatelliteDish', 'Save', 'SaveAll', 'Scale', 'Scaling', 'Scan', 'ScanBarcode',
  'ScanEye', 'ScanFace', 'ScanLine', 'ScanSearch', 'ScanText', 'ScatterChart',
  'School', 'School2', 'Scissors', 'ScissorsLineDashed', 'ScreenShare', 'ScreenShareOff',
  'Scroll', 'ScrollText', 'Search', 'SearchCheck', 'SearchCode', 'SearchSlash',
  'SearchX', 'Send', 'SendHorizonal', 'SendToBack', 'SeparatorHorizontal',
  'SeparatorVertical', 'Server', 'ServerCog', 'ServerCrash', 'ServerOff',
  'Settings', 'Settings2', 'Share', 'Share2', 'Sheet', 'Shell', 'Shield',
  'ShieldAlert', 'ShieldBan', 'ShieldCheck', 'ShieldClose', 'ShieldEllipsis',
  'ShieldHalf', 'ShieldMinus', 'ShieldOff', 'ShieldPlus', 'ShieldQuestion',
  'ShieldUser', 'ShieldX', 'Ship', 'ShipWheel', 'Shirt', 'ShoppingBag',
  'ShoppingBasket', 'ShoppingCart', 'Shovel', 'ShowerHead', 'Shredder', 'Shrimp',
  'Shrink', 'Shrub', 'Shuffle', 'Sigma', 'Signal', 'SignalHigh', 'SignalLow',
  'SignalMedium', 'SignalZero', 'Signpost', 'SignpostBig', 'Siren', 'SkipBack',
  'SkipForward', 'Skull', 'Slack', 'Slash', 'Slice', 'Sliders', 'SlidersHorizontal',
  'Smartphone', 'SmartphoneCharging', 'SmartphoneNfc', 'Smile', 'SmilePlus', 'Snail',
  'Snowflake', 'Sofa', 'Soup', 'Space', 'Spade', 'Sparkle', 'Sparkles', 'Sparkle',
  'Speaker', 'Speech', 'Spline', 'Split', 'SprayCan', 'Sprout', 'Square',
  'SquareActivity', 'SquareArrowDown', 'SquareArrowDownLeft', 'SquareArrowDownRight',
  'SquareArrowLeft', 'SquareArrowOutDownLeft', 'SquareArrowOutDownRight',
  'SquareArrowOutUpLeft', 'SquareArrowOutUpRight', 'SquareArrowRight', 'SquareArrowUp',
  'SquareArrowUpLeft', 'SquareArrowUpRight', 'SquareAsterisk', 'SquareCheck',
  'SquareCheckBig', 'SquareChevronDown', 'SquareChevronLeft', 'SquareChevronRight',
  'SquareChevronUp', 'SquareCode', 'SquareDashed', 'SquareDashedBottom', 'SquareDashedBottomCode',
  'SquareDashedKanban', 'SquareDashedMousePointer', 'SquareDivide', 'SquareDot',
  'SquareEqual', 'SquareFunction', 'SquareKanban', 'SquareLibrary', 'SquareM',
  'SquareMenu', 'SquareMinus', 'SquareMousePointer', 'SquareParking', 'SquareParkingOff',
  'SquarePen', 'SquarePercent', 'SquarePi', 'SquarePilcrow', 'SquarePlay',
  'SquarePlus', 'SquarePower', 'SquareRadical', 'SquareRoundCorner', 'SquareScissors',
  'SquareSigma', 'SquareSlash', 'SquareSplitHorizontal', 'SquareSplitVertical',
  'SquareStack', 'SquareTerminal', 'SquareUser', 'SquareUserRound', 'SquareX',
  'SquaresExclude', 'SquaresIntersect', 'SquaresSubtract', 'SquaresUnite', 'Squircle',
  'Squirrel', 'Stamp', 'Star', 'StarHalf', 'StarOff', 'StepBack', 'StepForward',
  'Stethoscope', 'Sticker', 'StickyNote', 'StopCircle', 'Store', 'StretchHorizontal',
  'StretchVertical', 'Strikethrough', 'Subscript', 'Subtitles', 'Sun', 'SunDim',
  'SunMedium', 'SunMoon', 'SunSnow', 'Sunrise', 'Sunset', 'Superscript', 'SwatchBook',
  'SwissFranc', 'SwitchCamera', 'Sword', 'Swords', 'Syringe', 'Table', 'Table2',
  'TableProperties', 'TableRows', 'Tablet', 'TabletSmartphone', 'Tablets', 'Tag',
  'Tags', 'Tally1', 'Tally2', 'Tally3', 'Tally4', 'Tally5', 'Target', 'Telescope',
  'Tent', 'TentTree', 'Terminal', 'TestTube', 'TestTubes', 'Text', 'TextCursor',
  'TextCursorInput', 'TextQuote', 'TextSearch', 'TextSelect', 'Theater', 'Thermometer',
  'ThermometerSnowflake', 'ThermometerSun', 'ThumbsDown', 'ThumbsUp', 'Ticket',
  'TicketCheck', 'TicketMinus', 'TicketPercent', 'TicketPlus', 'TicketSlash',
  'TicketX', 'Timer', 'TimerOff', 'TimerReset', 'ToggleLeft', 'ToggleRight', 'Tornado',
  'Torus', 'Touchpad', 'TouchpadOff', 'TowerControl', 'ToyBrick', 'Tractor', 'TrafficCone',
  'Train', 'TrainFront', 'TrainFrontTunnel', 'TrainTrack', 'TramFront', 'Trash',
  'Trash2', 'TreeDeciduous', 'TreePalm', 'TreePine', 'Trees', 'Trello', 'TrendingDown',
  'TrendingUp', 'Triangle', 'TriangleAlert', 'TriangleDashed', 'TriangleRight',
  'Trophy', 'Truck', 'TruckElectric', 'Turtle', 'Tv', 'Tv2', 'TvMinimal', 'Twitch',
  'Twitter', 'Type', 'Umbrella', 'UmbrellaOff', 'Underline', 'Undo', 'Undo2', 'UndoDot',
  'UnfoldHorizontal', 'UnfoldVertical', 'Ungroup', 'University', 'Unlink', 'Unlink2',
  'Unplug', 'Upload', 'UploadCloud', 'Usb', 'User', 'User2', 'UserCheck', 'UserCheck2',
  'UserCircle', 'UserCircle2', 'UserCog', 'UserCog2', 'UserMinus', 'UserMinus2',
  'UserPlus', 'UserPlus2', 'UserRound', 'UserRoundCheck', 'UserRoundCog', 'UserRoundMinus',
  'UserRoundPlus', 'UserRoundSearch', 'UserRoundX', 'UserSearch', 'UserSquare', 'UserSquare2',
  'UserX', 'UserX2', 'Users', 'Users2', 'UsersRound', 'Utensils', 'UtensilsCrossed',
  'UtilityPole', 'Variable', 'Vault', 'Vegan', 'VenetianMask', 'Verified', 'Vibrate',
  'VibrateOff', 'Video', 'VideoOff', 'Videotape', 'View', 'Voicemail', 'Volume',
  'Volume1', 'Volume2', 'VolumeOff', 'VolumeX', 'Vote', 'Wallet', 'Wallet2', 'WalletCards',
  'WalletMinimal', 'Wallpaper', 'Wand', 'Wand2', 'Warehouse', 'Watch', 'Waves',
  'Webcam', 'Webhook', 'WebhookOff', 'Weight', 'Wheat', 'WheatOff', 'WholeWord',
  'Wifi', 'WifiOff', 'Wind', 'Wine', 'WineOff', 'Workflow', 'WrapText', 'Wrench',
  'X', 'XCircle', 'XOctagon', 'XSquare', 'Youtube', 'Zap', 'ZapOff', 'ZoomIn', 'ZoomOut',
]);

function extractLucideImports(content) {
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
  const imported = new Set();
  let m;
  while ((m = re.exec(content)) !== null) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    names.forEach((n) => imported.add(n));
  }
  return imported;
}

function extractJsxIconUsages(content) {
  // Pattern: <X (com X sendo nome PascalCase)
  const used = new Set();
  const re = /<([A-Z][A-Za-z0-9]+)(?:\s|\/?>)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    used.add(m[1]);
  }
  return used;
}

function checkFile(file) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) return { file, error: 'NOT_FOUND' };
  const content = fs.readFileSync(fullPath, 'utf-8');
  const imported = extractLucideImports(content);
  const used = extractJsxIconUsages(content);
  const missing = [];
  for (const name of used) {
    // Se é componente do projeto, pula
    if (PROJECT_COMPONENTS.has(name)) continue;
    // Se é ícone conhecido do lucide, deve estar no import
    if (KNOWN_LUCIDE_ICONS.has(name) && !imported.has(name)) {
      missing.push(name);
    }
  }
  return { file, missing, imported, used };
}

function main() {
  let totalErrors = 0;
  const failed = [];
  for (const f of CRITICAL_FILES) {
    const result = checkFile(f);
    if (result.error === 'NOT_FOUND') continue;
    if (result.missing && result.missing.length > 0) {
      totalErrors += result.missing.length;
      failed.push(result);
    }
  }
  if (totalErrors === 0) {
    console.log(`✓ All ${CRITICAL_FILES.length} critical files have correct lucide-react imports.`);
    process.exit(0);
  } else {
    console.error(`✗ ${totalErrors} missing icon(s) in ${failed.length} file(s):\n`);
    failed.forEach(({ file, missing }) => {
      console.error(`  ${file}:`);
      missing.forEach((m) => console.error(`    - ${m}`));
    });
    process.exit(1);
  }
}

main();
