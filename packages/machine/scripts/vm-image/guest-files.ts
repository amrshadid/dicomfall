import {
  VM_AE_FILE,
  VM_BASHRC,
  VM_CONTROL_DONE,
  VM_CONTROL_READY,
  VM_EVENT_TTY,
  VM_HOSTNAME,
  VM_SHELL,
  VM_SHELL_PID_FILE,
} from '#types/definitions/vm'
import type { ArchiveEntry } from '#vm-image/archive'

// The 9p root is v86's "host9p" share; its modules come from this initramfs. cache=mmap, not
// loose: loose keeps a file's old pages, so a file root rewrites would never reach a reader.
export const INIT = `#!/bin/busybox sh
/bin/busybox --install -s /bin
mount -t proc proc /proc
mount -t sysfs sys /sys
mount -t devtmpfs dev /dev
for m in netfs 9pnet 9pnet_virtio 9p; do insmod /lib/$m.ko; done
mkdir -p /newroot
until mount -t 9p -o trans=virtio,version=9p2000.L,cache=mmap,msize=512000 host9p /newroot; do
  echo "Mounting the root failed. Type 'exit' to try again."
  sh
done
mount --move /dev /newroot/dev
umount /proc /sys
exec switch_root /newroot /sbin/init
`

// The console's shell starts inside the selected AE's namespace, so ip, ping and go-dicom's
// sockets are that AE's. init starts the next one when this one is killed, which is how the
// console moves to another AE. Every exec keeps the pid, so the pid file names bash.
export const SHELL = `#!/bin/sh
echo $$ > ${VM_SHELL_PID_FILE}
export TERM=xterm-256color HOME=/root
cd /root
ae=$(cat ${VM_AE_FILE} 2>/dev/null)
[ -n "$ae" ] && exec ip netns exec "$ae" unshare -u sh -c "hostname $ae && DF_AE=$ae exec bash --rcfile ${VM_BASHRC} -i"
exec bash --rcfile ${VM_BASHRC} -i
`

export const BASHRC = `PS1="\${DF_AE:-${VM_HOSTNAME}}:\\w# "
`

// busybox init: a login-free root shell on the player's console (COM1), root's control channel on COM3.
export const INITTAB = `::sysinit:/etc/df-rc
ttyS0::respawn:/sbin/getty -n -l ${VM_SHELL} 115200 ttyS0 vt100
ttyS2::respawn:/usr/sbin/df-control
::ctrlaltdel:/sbin/reboot
::shutdown:/bin/umount -a -r
`

// veth joins the AEs' namespaces, sch_netem loses a link's packets while it stays up, and
// af_packet lets tcpdump watch a link. No hotplug helper loads them on demand, and a module loaded
// now is in every saved boot, so the module files are never fetched again.
export const RC = `#!/bin/sh
mount -t proc proc /proc 2>/dev/null
mount -t sysfs sys /sys 2>/dev/null
mkdir -p /dev/pts /dev/shm
mount -t devpts devpts /dev/pts
mount -t tmpfs tmpfs /tmp
mount -t tmpfs tmpfs /run
hostname ${VM_HOSTNAME}
ip link set lo up
ln -s /proc/self/fd /dev/fd
modprobe -q veth
modprobe -q sch_netem
modprobe -q af_packet
`

// The host's root channel for a mission's setup and its checks: a command line in, its status
// out. init starts it, so it is no descendant of the player's shell.
// bash, for EPOCHREALTIME: a fault's moment is stamped by the shell that injects it, without
// starting a process. The event port (COM2) is raw too, so lines arrive as they were written.
export const CONTROL = `#!/bin/bash
stty -F ${VM_EVENT_TTY} raw -echo
stty -F /dev/ttyS2 raw -echo
exec </dev/ttyS2 >/dev/ttyS2 2>&1
echo ${VM_CONTROL_READY}
while IFS= read -r line; do
  eval "$line"
  echo "${VM_CONTROL_DONE} $?"
done
`

export function guestFile(path: string, content: string | Uint8Array, mode = 0o644): ArchiveEntry {
  const data = typeof content === 'string' ? new TextEncoder().encode(content) : content
  return { path, kind: 'file', mode, uid: 0, gid: 0, mtime: 0, link: '', data }
}
