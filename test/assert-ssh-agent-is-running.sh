#!/bin/bash

if [ $(ps ax | grep [s]sh-agent | wc -l) -gt 0 ] ; then
  echo "The ssh-agent is running which is expected."

else
  echo "The ssh-agent is not running which is NOT expected."
  exit 1
fi