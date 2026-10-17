export const VIDEO = { width: 1080, height: 1920, fps: 60 };

// TikTok draws its tabs at the top, caption and music at the bottom and
// buttons on the right: everything that matters stays inside this box.
export const SAFE = { top: 190, bottom: 1500, left: 72, right: 940 };

/** The card the site's page is shown in, between its label and the subtitles */
export const CARD = { x: 56, y: 486, w: 968, h: 880 };
/** Where shots of the page frame what matters: the safe area inside the card */
export const CARD_FOCUS = { x: SAFE.left, y: CARD.y + 16, w: SAFE.right - SAFE.left, h: CARD.h - 32 };
/** The mascot's bubble in the corner of the data shots */
export const BUBBLE = { x: 56, y: 260, size: 196 };
/** The site's address, small at the bottom right of every shot, under the subtitles */
export const SITE_MARK = { right: VIDEO.width - SAFE.right, top: SAFE.bottom + 10 };
/** Labels start beside the bubble and sit just above the card */
export const LABEL = { left: BUBBLE.x + BUBBLE.size + 28, bottom: VIDEO.height - CARD.y + 16 };
