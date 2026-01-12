#!/bin/bash
# Download alert .mp3 files for Call Center Helper
# Run this script from the audio/ directory or adjust paths as needed

set -e

cd ./audio

# Download files if they do not exist
function download_if_missing() {
  local url="$1"
  local filename="$2"
  if [ ! -f "$filename" ]; then
    echo "Downloading $filename..."
    curl -L -o "$filename" "$url"
  else
    echo "$filename already exists, skipping."
  fi
}

download_if_missing "https://assets.mixkit.co/active_storage/sfx/276/276-preview.mp3" "276-preview.mp3" # End game sound
download_if_missing "https://assets.mixkit.co/active_storage/sfx/933/933-preview.mp3" "933-preview.mp3" # Bell sound
download_if_missing "https://assets.mixkit.co/active_storage/sfx/1071/1071-preview.mp3" "1071-preview.mp3" # Church / tower bell sound

echo "All alert sounds downloaded."
