const BOT_SHOT_BASE = 'https://raw.githubusercontent.com/numbpill3d/ricehub/master/public/assets/bot-shots';

export const SCREENSHOT_CATALOG = {
  'nordic-kde plasma + kvantum complete': ['nordic-kde.webp', 'https://github.com/EliverLara/Nordic-kde'],
  'tokyo-night hyprland + eww bar': ['tokyo-night.webp', 'https://github.com/rxyhn/bspdots'],
  'catppuccin-mocha sddm greeter': ['catppuccin-sddm.webp', 'https://github.com/Keyitdev/sddm-astronaut-theme'],
  'material-you cursors for wayland/x11': ['material-you.webp', 'https://github.com/koeqaife/hyprland-material-you'],
  'gruvbox-material kvantum + gtk': ['gruvbox-material.webp', 'https://github.com/Frost-Phoenix/nixos-config'],
  'rose-pine dawn gtk + gnome-shell': ['rose-pine.webp', 'https://github.com/iamverysimp1e/dots'],
  'everforest eww bar + rofi': ['everforest-eww.webp', 'https://github.com/flick0/dotfiles'],
  'dracula-pro plasma + konsole': ['dracula-plasma.webp', 'https://github.com/gh0stzk/dotfiles'],
  'nordic-walls: 50+ 4k wallpapers': ['nordic-walls.webp', 'https://github.com/1amSimp1e/dots'],
  'monochrome dotfiles: chezmoi + nix': ['monochrome-dots.webp', 'https://github.com/ryan4yin/nix-config'],
};

export function screenshotFor(title) {
  const shot = SCREENSHOT_CATALOG[title];
  if (!shot) throw new Error(`No screenshot configured for "${title}"`);
  const [filename, source] = shot;
  return { filename, source, url: `${BOT_SHOT_BASE}/${filename}` };
}
