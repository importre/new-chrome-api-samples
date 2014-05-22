새로운 크롬 API 만들기
==================

작성자 : 허재위([Jaewe Heo](https://plus.google.com/+JaeweHeo))


목차
---

- 목표
- API 이름 등록 및 속성 정의
- IDL을 이용한 API 모델 생성
- 새로운 퍼미션 등록
- 테스트
- 문서화
- 결과
- 트러블슈팅
- 참고


목표
---

크롬 익스텐션과 크롬 앱에서 동작하는 **새로운 크롬 API**를 만들고,
직접 만든 API를 이용하여 간단한 크롬 익스텐션과 크롬 앱을 만들어 보는 것을 목표로 한다.

### 새로운 API 스펙

- 이름: `chrome.gdgkr`
- 퍼미션: `gdgkr`
- 메소드: `chrome.gdgkr.greeting(string name, function callback) { ... };`
  - 파라미터
    - `name`: optional
    - `callback`: `function (Response response) { ... };`
- 타입
  - `Response`: object
    - `message`: `Hello, [name]!!!`
    - `bytes`: `message`의 byte 수

### 기대되는 사용 방법

크롬 익스텐션이나 크롬 앱에서 기대되는 사용방법은 아래와 같다.

#### manifest.json

 `manifst.json`에 권한을 추가한다.

```json
{
  ...
  "permissions": [..., "gdgkr", ...],
  ...
}
```

#### xxx.js

자바스크립트 파일에서 `chrome.gdgkr.greeting()` 함수를 호출한다.  
첫 번째 파라미터는 생략 가능하다.

```js
// name 파라미터 생략
chrome.gdgkr.greeting(function (response) {
  console.log(response.message); // Hello, GDG Korea WebTech!!!
});

// name 파라미터: Jaewe Heo
chrome.gdgkr.greeting('Jaewe Heo', function (response) {
  console.log(response.message); // Hello, Jaewe Heo!!!
});
```


API 이름 등록 및 속성 정의
---------------------

### 작업 브랜치 생성

우선 작업할 브랜치를 아무거나 하나(여기서는 `gdgkr_api`) 생성한 후에 진행한다.

```sh
$ git checkout -b gdgkr_api
```

### API 등록 및 속성 정의

#### \_api\_features.json

앞서 목표에서 언급했듯 `chrome.gdgkr` API를 만들 것이므로 새 API 이름인 `gdgkr`을
`chrome/common/extensions/api/_api_features.json`에 아래와 같이 추가한다.

> 앞으로 파일 수정 시 특별한 언급이 없으면 사전 순으로 코드를 추가할 것이다.

```json
...
"gdgkr": {
  "dependencies": ["permission:gdgkr"],
  "contexts": ["blessed_extension"]
},
...
```
> contexts 참고: [api_feature][api_feature]

#### \_permission\_features.json

퍼미션 또한 `chrome/common/extensions/api/_permission_features.json` 파일에
`gdgkr`을 아래와 같이 추가한다.

```json
"gdgkr": {
  "channel": "dev",
  "extension_types": ["extension", "platform_app"]
},
```


IDL을 이용한 API 모델 생성
----------------------

**IDL**이란 Interface Definition Language의 약어로 말 그대로 인터페이스를 정의하기 위한 언어이다.

크로미엄에서는 웹 인터페이스를 지정하고 자바스크립트 바인딩(C++ code)을 생성하기 위해 IDL 파일을 사용한다.  
웹 인터페이스를 정의하는데 표준으로 사용되는 것이 [**WebIDL**][webidl]이고,
크로미엄은 [속성들을 확장][ex_webidl]하여 사용한다.

### IDL 파일 정의

생성할 API 및 타입을 IDL에 정의한다.

#### gdgkr.idl

`chrome/common/extensions/api`에 `gdgkr.idl` 파일을 아래와 같이 생성한다.  
주석은 추후 문서화하는데 사용된다.

```cpp
// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// GDG Korea Dev API
namespace gdgkr {

  // greeting에 대한 응답 객체
  dictionary Response {
    // "Hello, [이름]!!!"
    DOMString message;

    // 응답 메시지 바이트 수
    long bytes;
  };

  // greeting 콜백 함수
  callback GreetingCallback = void (Response response);

  interface Functions {
    // greeting 함수로 인사를하면 받아줍니다.
    // name은 생략 가능합니다.
    // (이름이 없어도 인사를 받아줌. 끨)
    // |name|: 당신의 이름
    static void greeting(optional DOMString name, GreetingCallback callback);
  };
};
```

#### api.gyp

`chrome/common/extensions/api/api.gyp` 파일에 앞서 만든 `gdgkr.idl`을 적당한 곳에 추가한다.
본인은 아래와 같이 추가했다.

```json
...
'conditions': [
  ['OS!="android"', {
    'schema_files': [
      ...
      'gdgkr.idl',
      ...
    ],
  },
  ...
  ],
  ...
],
...
```

`./build/gyp_chromium` 명령을 통해
`out/Debug/obj/chrome/common/extensions/api/chrome_api.ninja` 파일을 다시 생성한다.  
ninja 빌드 시스템에 새로운 API를 추가해야 하기 때문이다.

```sh
$ ./build/gyp_chromium
```

`chrome_api.ninja` 파일을 보면 `gdgkr.idl` 파일에서 `gdgkr.cc`와 `gdgkr.h` 파일을 생성할 수 있는 빌드 스크립트임을 알 수 있다.  
참고로 `.idl` 파일을 만들고 `.cc`와 `.h`를 바로 만들어서 확인하려면 `tools/json_schema_compiler/compiler.py`를 사용하면 된다.

### API 몸통 구현하기

`chrome/browser/extensions/api/gdgkr` 디렉토리를 생성하고, 그 곳에 C++로 구현한다.

```sh
$ mkdir -p chrome/browser/extensions/api/gdgkr && cd $_
$ touch gdgkr_api.h gdgkr_api.cc
```

#### chrome/browser/extensions/api/gdgkr/gdgkr_api.h

비동기적으로 동작하는 함수를 만들기 위해 `AsyncExtensionFunction`을 상속받는 클래스를 작성한다.  
`RunAsync()` 메소드를 재정의하여 실제 동작하는 부분을 구현할 것이다.  
`GDGKR_GREETING`은 enum으로 아래쪽 퍼미션 관련 구현 부분에서 추가할 예정이다.

코드는 아래와 같다.

```cpp
// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_BROWSER_EXTENSIONS_API_GDGKR_GDGKR_API_H__
#define CHROME_BROWSER_EXTENSIONS_API_GDGKR_GDGKR_API_H__

#include "chrome/browser/extensions/chrome_extension_function.h"

namespace extensions {

struct Response;

class GdgkrGreetingFunction : public AsyncExtensionFunction {
 protected:
  virtual ~GdgkrGreetingFunction() {}

  // ExtensionFunction:
  virtual bool RunAsync() OVERRIDE;

 private:
  void Callback(const std::string& name, Response* response);
  DECLARE_EXTENSION_FUNCTION("gdgkr.greeting", GDGKR_GREETING)
};

} //  namespace extensions

#endif  // CHROME_BROWSER_EXTENSIONS_API_GDGKR_GDGKR_API_H__
```

#### chrome/browser/extensions/api/gdgkr/gdgkr_api.cc

자바스크립트에서 파라미터를 넘기면 `args_`에 저장된다.  
앞서 정의한 스펙에 의해 파라미터가 넘어오지 않을 수 있으므로 `NULL` 체크를 해준다.

IDL compiler로 생성된 Response 객체에 원하는 값을 넣고 반환할 결과를 `SetResult()`를 통해 설정한다.  
마지막으로 `SendResponse()`로 성공했음을 알린다.

코드는 아래와 같다.

```cpp
// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/browser/extensions/api/gdgkr/gdgkr_api.h"

#include "base/values.h"
#include "chrome/common/extensions/api/gdgkr.h"

namespace extensions {

bool GdgkrGreetingFunction::RunAsync() {
  std::string message = "GDG Korea WebTech";

  if (NULL != args_) {
    scoped_ptr<api::gdgkr::Greeting::Params> params(
        api::gdgkr::Greeting::Params::Create(*args_));
    EXTENSION_FUNCTION_VALIDATE(params.get());
    message = params->name.get() ? *params->name : message;
  }

  // WriteToConsole(content::CONSOLE_MESSAGE_LEVEL_WARNING, message.c_str());
  message = "Hello, " + message + "!!!";

  api::gdgkr::Response response;
  response.message = message;
  response.bytes = (int) message.length();
  SetResult(response.ToValue().release());

  SendResponse(true);
  return true;
}

void GdgkrGreetingFunction::Callback(const std::string& name, Response* response) {
}

}  // namespace extensions
```

#### chrome\_browser\_extensions.gypi

`chrome/chrome_browser_extensions.gypi` 파일에 방금 구현한 파일을 추가하고,

```json
...
'browser/extensions/api/gdgkr/gdgkr_api.cc',
'browser/extensions/api/gdgkr/gdgkr_api.h',
...
```

`./build/gyp_chromium`를 실행한다.

```sh
$ ./build/gyp_chromium
```


새로운 퍼미션 등록
--------------

퍼미션과 관련된 파일들에 `gdgkr` 퍼미션을 추가한다.

#### api_permission.h

`extensions/common/permissions/api_permission.h` 파일을 아래와 같이 수정한다.

```cpp
...
kGdgkr,
...
```

#### chrome\_api\_permissions.cc

`chrome/common/extensions/permissions/chrome_api_permissions.cc` 파일에서
`ChromeAPIPermissions::GetAllPermissions()` 메소드에 `gdgkr` 권한을 추가한다.

```cpp
...
{APIPermission::kGdgkr , "gdgkr"},
...
```

#### extension\_function\_histogram\_value.h

`extensions/browser/extension_function_histogram_value.h` 파일을 수정한다.  
`enum HistogramValue`에 추가해야 하는데, 순서는 바꾸지 말고, `ENUM_BOUNDARY` 앞에 추가하도록 한다.

```cpp
...
GDGKR_GREETING,
...
```

#### histograms.xml

`tools/metrics/histograms/histograms.xml` 파일을 수정한다.  
`value` 속성은 아마 앞에서 추가한 enum 값이라 생각된다.
본인이 가진 파일 앞의 값이 `774`여서 아래와 같이 `775`로 추가했다.

```xml
...
<int value="775" label="GDGKR_GREETING"/>
...
```


테스트
-----

새로 생성한 API를 테스트하기 위해 테스트 코드를 구현하고 제대로 동작하는지 확인한다.

### 테스트 코드 구현

#### gdgkr\_api\_unittest.cc

테스트 파일 `chrome/browser/extensions/api/gdgkr/gdgkr_api_unittest.cc`를 구현한다.

`greeting()` 함수가 스펙대로 동작하는지 확인하는 코드를 구현했다.

```cpp
// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <string>

#include "base/memory/scoped_ptr.h"
#include "base/strings/stringprintf.h"
#include "base/values.h"
#include "chrome/browser/extensions/api/gdgkr/gdgkr_api.h"
#include "chrome/browser/extensions/extension_api_unittest.h"
#include "chrome/browser/extensions/extension_function_test_utils.h"
#include "chrome/common/extensions/api/gdgkr.h"

typedef extensions::api::gdgkr::Response JsResponse;

namespace extensions {

namespace utils = extension_function_test_utils;

class ExtensionGdgkrTest : public ExtensionApiUnittest {
 public:
  using ExtensionApiUnittest::RunFunction;

  virtual void SetUp() {
    ExtensionApiUnittest::SetUp();
  }
};

TEST_F(ExtensionGdgkrTest, Greeting) {
  {
    JsResponse response;
    scoped_ptr<base::DictionaryValue> result(RunFunctionAndReturnDictionary(
        new GdgkrGreetingFunction(), "[null]"));
    ASSERT_TRUE(result.get());
    EXPECT_TRUE(JsResponse::Populate(*result, &response));

    EXPECT_EQ("Hello, GDG Korea WebTech!!!", response.message);
    EXPECT_EQ(27, response.bytes);
  }

  {
    JsResponse response;
    scoped_ptr<base::DictionaryValue> result(RunFunctionAndReturnDictionary(
        new GdgkrGreetingFunction(), "[\"Jaewe Heo\"]"));
    ASSERT_TRUE(result.get());
    EXPECT_TRUE(JsResponse::Populate(*result, &response));

    EXPECT_EQ("Hello, Jaewe Heo!!!", response.message);
    EXPECT_EQ(19, response.bytes);
  }
}

}
```

### 테스트 빌드

#### chrome\_tests\_unit.gypi

구현한 테스트 코드를 빌드하기 위해 `chrome/chrome_tests_unit.gypi`에
`gdgkr_api_unittest.cc`를 추가하고,

```json
...
browser/extensions/api/gdgkr/gdgkr_api_unittest.cc
...
```

`./build/gyp_chromium`를 실행한다.

```sh
$ ./build/gyp_chromium
```

`unit_tests` 실행파일을 생성하기 위해 빌드를 아래와 같이 수행한다.

```sh
$ ninja -C out/Debug unit_tests
```

### 테스트 실행

방금 생성한 테스트를 수행해본다.

```sh
$ ./out/Debug/unit_tests --single-process-tests --gtest_filter=ExtensionGdgkrTest\*
```

대략 결과는 아래와 같이 나온다. 테스트 성공!

```
Note: Google Test filter = ExtensionGdgkrTest*
[==========] Running 1 test from 1 test case.
[----------] Global test environment set-up.
[----------] 1 test from ExtensionGdgkrTest
[ RUN      ] ExtensionGdgkrTest.Greeting
[       OK ] ExtensionGdgkrTest.Greeting (2493 ms)
[----------] 1 test from ExtensionGdgkrTest (2597 ms total)

[----------] Global test environment tear-down
[==========] 1 test from 1 test case ran. (2598 ms total)
[  PASSED  ] 1 test.
```


문서화
----

새로 생성한 API를 문서화 하는 방법은 [이 문서][doc]를 참고하면 된다.  
숙제로 남겨둔다.

대략 완성된 모습을 보면 아래와 비슷할 것이다.

![doc](https://raw.githubusercontent.com/importre/resources/master/new-chrome-api-samples/doc.gif)


결과
---

마지막으로 새로 구현한 API가 크롬 익스텐션과 크롬 앱에서 잘 동작하는지 확인한다.

### 크롬 익스텐션 & 크롬 앱

구현한 샘플들은 [Github][samples]에서 확인할 수 있다.

![samples](https://raw.githubusercontent.com/importre/resources/master/new-chrome-api-samples/sample.gif)


트러블슈팅
-------

개인적으로 삽질이 좀 많았다. 특히 `cpp` 파일을 추가/수정
후 크로미엄 제대로 실행되지 않는 현상을 몇 번 겪었는데, 로그를 보고 원인 파악을 할 수 있었다.

#### OS X 로그 경로

`out/Debug/Chromium.app/Contents/Versions/버전/chrome_debug.log`


참고
---

> [Implementing a new extension API][creating_new_apis]  
> [Running basic tests][tests]  
> [WebIDL][webidl]  
> [WebIDL 한국어 자료][webidl_kor]  
> [WebIDL Interfaces][webidl_interfaces]  

끝.

[creating_new_apis]: http://dev.chromium.org/developers/design-documents/extensions/proposed-changes/creating-new-apis
[api_feature]: https://code.google.com/p/chromium/codesearch#chromium/src/extensions/common/features/feature.h&sq=package:chromium&dr=CSs&l=25
[tests]: http://www.chromium.org/developers/testing/running-tests
[webidl]: http://www.w3.org/TR/WebIDL/
[webidl_kor]: http://pds24.egloos.com/pds/201203/07/22/Web_IDL_posted.pdf
[webidl_interfaces]: http://www.chromium.org/developers/web-idl-interfaces
[ex_webidl]: http://www.chromium.org/blink/webidl/blink-idl-extended-attributes
[doc]: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/common/extensions/docs/README&sq=package:chromium
[samples]: https://github.com/importre/new-chrome-api-samples
