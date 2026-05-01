"""Fix ELF shared libraries that require executable stack (blocked by Docker)."""
import os
import struct

def fix_execstack(path):
    with open(path, 'rb') as fh:
        data = bytearray(fh.read())

    if data[:4] != b'\x7fELF':
        return False

    is_64bit = data[4] == 2
    phoff = struct.unpack('<Q' if is_64bit else '<I', data[32:32+8 if is_64bit else 32+4])[0]
    phentsize = struct.unpack('<H', data[54:56] if is_64bit else data[42:44])[0]
    phnum = struct.unpack('<H', data[56:58] if is_64bit else data[44:46])[0]
    PT_GNU_STACK = 0x6474e551

    fixed = False
    for i in range(phnum):
        off = phoff + i * phentsize
        p_type = struct.unpack('<I', data[off:off+4])[0]
        if p_type != PT_GNU_STACK:
            continue
        p_flags = struct.unpack('<I', data[off+4:off+8])[0]
        if p_flags & 1:
            new_flags = p_flags & ~1
            data[off+4:off+8] = struct.pack('<I', new_flags)
            fixed = True
            print(f'Fixed execstack: {path}')
    if fixed:
        with open(path, 'wb') as fh:
            fh.write(data)
    return fixed

if __name__ == '__main__':
    for root, dirs, files in os.walk('/usr/local'):
        for f in files:
            if 'ctranslate2' not in root and 'ctranslate2' not in f:
                continue
            if not f.endswith('.so') and '.so.' not in f:
                continue
            try:
                fix_execstack(os.path.join(root, f))
            except Exception as e:
                print(f'Skip: {os.path.join(root, f)}: {e}')
