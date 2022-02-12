exports.getDate = function() {
  const today = new Date();
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  };
  return today.toLocaleString('en-IN', options);
};

exports.getDay = function() {
  const today = new Date();
  const options = {
    weekday: 'long',
  };

  return today.toLocaleString('en-IN', options);
};

exports.getDueDate = function() {
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 3);
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  };
  return dueDate.toLocaleString('en-IN', options);
};