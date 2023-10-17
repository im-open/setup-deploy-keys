if [ $(ps ax | grep [s]sh-agent | wc -l) -gt 0 ] ; then
  echo "The ssh-agent is running which is not expected."
  
  echo "
List ssh keys:"
  ssh-add -l

  exit 1;
else
  echo "The ssh-agent is not running which is expected."
fi