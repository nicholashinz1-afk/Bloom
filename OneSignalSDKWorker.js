importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Handle notification clicks — ensures tapping a notification opens/focuses the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Use the URL from notification data if available, otherwise default to app root
  var url = (event.notification.data && event.notification.data.url)
    || (event.notification.data && event.notification.data.launchURL)
    || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If the app is already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf('bloomselfcare.app') !== -1 || client.url.indexOf('localhost') !== -1) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});
