#!/usr/bin/env python3
"""塗鴉風（GPT 畫的）房間和小人 → public/room/doodle/

來源 art/source/doodle/：
  room.png   房間（1254×1254，米色底）
  chars.png  角色設定圖：女孩正面、側面走路、背面，貓坐著、睡覺（白底）

小人：去背後統一縮放（三個角度用同一個比例），放進 267×420 的畫布，腳底在 (133.5, 412)，
和像素女孩的畫布一樣大，頭像、換裝畫面的 CSS 才能共用。
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art/source/doodle'
OUT = ROOT / 'public/room/doodle'
CANVAS = (267, 420)
FOOT = (133.5, 412)
GIRL_H = 360  # 正面女孩在畫布裡的高度
# 設定圖裡每個角色的範圍（x0, y0, x1, y1）
BOXES = {
    'girl_front': (20, 230, 370, 730),
    'girl_side': (370, 230, 715, 730),
    'girl_back': (725, 230, 1075, 730),
    'cat_sit': (1085, 455, 1345, 720),
    'cat_sleep': (1355, 500, 1665, 720),
}


def cutout(im):
    """去掉從邊緣連過來的白底"""
    a = np.array(im.convert('RGB')).astype(int)
    white = a.min(axis=2) > 232
    lab, _ = ndimage.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ndimage.binary_opening(~np.isin(lab, list(edge)), iterations=1)
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def room_cutout(im):
    """房間：去掉從邊緣連過來的米色底（房間才能放在天空、草地的背景上）"""
    a = np.array(im.convert('RGB')).astype(int)
    bg = np.abs(a - np.array([253, 244, 227])).max(axis=2) < 14
    lab, _ = ndimage.label(bg)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(edge))
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.8))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    room = room_cutout(Image.open(SRC / 'room.png'))
    room.save(OUT / 'room.webp', quality=90, method=6)
    sheet = cutout(Image.open(SRC / 'chars.png'))
    parts = {k: sheet.crop(b) for k, b in BOXES.items()}
    parts = {k: p.crop(p.getbbox()) for k, p in parts.items()}
    scale = GIRL_H / parts['girl_front'].height
    for k, p in parts.items():
        p = p.resize((round(p.width * scale), round(p.height * scale)), Image.LANCZOS)
        if k.startswith('girl'):
            c = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
            c.alpha_composite(p, (round(FOOT[0] - p.width / 2), round(FOOT[1] - p.height)))
            p = c
        p.save(OUT / f'{k}.webp', quality=92, method=6)
        print(k, p.size)


if __name__ == '__main__':
    main()
