export const getDeviceId = (): string => {
  let id = localStorage.getItem('theroom_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('theroom_device_id', id);
  }
  return id;
};
