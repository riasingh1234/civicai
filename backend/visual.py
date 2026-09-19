"""Perceptual hashing so we can tell whether two photos show the same thing.

We use a difference hash (dHash): shrink to 9x8 greyscale, compare each pixel to
its right neighbour, pack the 64 booleans into a hex string. Two photos of the
same pothole taken from slightly different angles end up within ~10 bits of each
other, while unrelated photos sit near 32 bits (random).

dHash is used instead of a CNN embedding on purpose - it is deterministic, needs
no model download, and runs in a couple of milliseconds on Render's free tier.
"""

import io
from PIL import Image

HASH_SIZE = 8
MAX_BITS = HASH_SIZE * HASH_SIZE  # 64


def dhash(image_bytes):
    """Return a 16-char hex string, or None if the bytes aren't a readable image."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("L")
        img = img.resize((HASH_SIZE + 1, HASH_SIZE), Image.LANCZOS)
        px = list(img.getdata())

        bits = []
        for row in range(HASH_SIZE):
            offset = row * (HASH_SIZE + 1)
            for col in range(HASH_SIZE):
                bits.append(px[offset + col] > px[offset + col + 1])

        value = 0
        for bit in bits:
            value = (value << 1) | int(bit)
        return f"{value:016x}"
    except Exception as e:
        print("dhash failed:", e)
        return None


def hamming(hash_a, hash_b):
    if not hash_a or not hash_b:
        return MAX_BITS
    return bin(int(hash_a, 16) ^ int(hash_b, 16)).count("1")


def visual_similarity(hash_a, hash_b):
    """0-1. 1.0 means pixel-identical hashes."""
    if not hash_a or not hash_b:
        return 0.0
    distance = hamming(hash_a, hash_b)
    # Anything past ~half the bits is noise, so clamp there instead of letting
    # unrelated images score 0.4 just because random hashes differ by 32 bits.
    if distance >= MAX_BITS / 2:
        return 0.0
    return 1.0 - (distance / (MAX_BITS / 2))
