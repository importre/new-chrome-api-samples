new-chrome-api-samples
======================

크로미엄에 새로운 API를 추가하고 추가한 API를 크롬 익스텐션과 크롬 앱에 적용시킨 샘플 프로젝트

자세한 설명은 [크로미엄 원정대 블로그][cof]를 참고하거나 [GUIDE.md](GUIDE.md) 참고


디렉토리 구조
----------

| Directory | Note |
| --------- | ---- |
| app       | 새로운 API를 사용한 크롬 앱 ([chromeapp generator][yo_chromeapp]로 생성) |
| extension | 새로운 API를 사용한 크롬 익스텐션 ([chrome-extension generator][yo_chrome_ex]로 생성) |


새로운 API
---------

### chrome.gdgkr.greeting

```js
chrome.gdgkr.greeting('importre', function (response) {
  console.log(response.message); // Hello, importre!!!
});
```

결과물
-----

아래는 크롬 앱과 크롬 익스텐션을 실행한 화면이다.  
또한 콘솔에서 API를 사용하는 모습을 확인할 수 있다. 

![samples](https://raw.githubusercontent.com/importre/resources/master/new-chrome-api-samples/sample.gif)


문서화 예제
--------

![doc](https://raw.githubusercontent.com/importre/resources/master/new-chrome-api-samples/doc.gif)



[yo_chromeapp]: https://github.com/yeoman/generator-chromeapp
[yo_chrome_ex]: https://github.com/yeoman/generator-chrome-extension
[cof]: http://chromium.gdg.kr/saeroun-keurom-api-mandeulgi
