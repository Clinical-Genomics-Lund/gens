#!/usr/bin/env bash
set -e

# Setup production configuration
if [[ ! "${FLASK_ENV}" == development ]]; then
				echo "Mount Lennart access drive"
				mkdir -p "${HOME}/access"
				sshfs																	\
					-o reconnect,transform_symlinks,idmap=user							\
					-o ro,ServerAliveInterval=30,ServerAliveCountMax=5					\
					-o StrictHostKeyChecking=no											\
					-p 22																\
					worker@lennart:/media/isilon/backup_hopper/results "${HOME}/access"
fi

# run commands given to container
echo "Executing command: ${@}"
exec "${@}"
