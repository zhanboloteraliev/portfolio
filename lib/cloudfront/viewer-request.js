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

  // Astro's static output writes clean routes as e.g. resume/index.html.
  // S3 (behind OAC) only ever matches an exact object key, and
  // defaultRootObject only rewrites the bare "/" — so every other clean
  // URL needs an explicit index.html appended here.
  var uri = request.uri;
  if (uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (uri.lastIndexOf(".") <= uri.lastIndexOf("/")) {
    request.uri += "/index.html";
  }

  return request;
}
