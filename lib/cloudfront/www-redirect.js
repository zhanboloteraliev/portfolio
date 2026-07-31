function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;
  if (host.indexOf("www.") === 0) {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: { value: "https://" + host.slice(4) + request.uri },
      },
    };
  }
  return request;
}
