#!/bin/bash

path=''

for arg in "$@"; do
    case $arg in
    --path)
        path=$2
        shift # Remove argument --name from `$@`
        shift # Remove argument value from `$@`
        ;;
    esac
done

echo "Path: '$path'"

exitCode=0
if [ -d "./$path" ]; then
  echo "The dir exists which is expected."
  echo "
Existing Items in $path:"
  ls -a $path
else
  echo "The dir does NOT exist which is NOT expected."
  echo "
Existing Items in root:"
  ls -a
  exit 1
fi