# 午後I 読み比べノート

ITストラテジスト午後Iの問題冊子・解答例・採点講評を、年度ごとに並べて読むための静的Webアプリです。初期データとして令和7年度春期を設定しています。

## 起動方法

1. このフォルダでターミナルを開きます。
2. Pythonが使える環境で、`py -m http.server 4173` を実行します（macOS/Linuxでは `python3 -m http.server 4173`）。
3. ブラウザで [http://localhost:4173](http://localhost:4173) を開きます。

追加のパッケージやビルドは不要です。初回表示時にPDF.jsをCDNから読み込み、PDFはIPA公式サイトから取得します。初回はネット接続が必要です。

## 使い方

- 年度を選ぶと、問題・解答例・採点講評が3列で表示されます。資料ごとに独立して開閉・スクロールできます。
- 「マーカー」を選んでPDF上の文章をドラッグ選択すると、ハイライトが付きます。
- 「しおり」を選んでPDFの任意の高さをクリックし、名前を付けると横線しおりが付きます。一覧からその位置へ移動できます。
- 5色のボタンで新しい注釈の色を選べます。注釈一覧の「×」で削除できます。
- 年度・資料ごとの注釈、開閉状態、PDF内の表示位置はブラウザのlocalStorageへ自動保存します。
- PDF本体は初回取得後にIndexedDBへ保存し、次回からローカルコピーを使います。右上の「資料キャッシュを削除」でPDFキャッシュを消せます。

PDFキャッシュと学習メモはブラウザ・端末ごとに保存されます。同じブラウザの同じオリジン（localhostのポートを含む）で開いてください。ブラウザのサイトデータを消すと、保存したPDFとメモも消去されます。

## 年度の追加

`app.js` 冒頭の `YEARS` に年度ID、表示ラベル、春期/秋期、IPAの年度ページURL、問題・解答例・採点講評それぞれの公式PDF URLを追加します。現在の実装は年度設定と描画処理を分離しているため、PDFの差し替えに設問単位のデータ化は不要です。

## IPA資料と利用条件

- 初期資料：令和7年度春期 ITストラテジスト試験 午後Ⅰ
- 出典ページ：[IPA 問題冊子・配点割合・解答例・採点講評（2025年度、令和7年度）](https://www.ipa.go.jp/shiken/mondai-kaiotu/2025r07.html)
- 利用条件：[IPA 試験に関するよくある質問](https://www.ipa.go.jp/shiken/faq.html)

IPAは著作権を放棄していません。FAQでは、試験制度の意義に反しない教育目的などで過去問題を利用する場合、法令上の例外を除き許諾・使用料は不要と案内し、出典の明記を求めています。本アプリはPDFをリポジトリへ複製せず、公式PDFを読み込んで表示します。利用時はIPAの最新の案内をご確認ください。

## Cloudflare Pagesへの公開

`.github/workflows/deploy-pages.yml` が `main` へのpush時と、GitHub Actionsからの手動実行時にPagesへ公開します。ビルドやテスト工程はなく、公開用ファイルを `dist/` にコピーしてアップロードします。

GitHubリポジトリの **Settings → Secrets and variables → Actions → Repository secrets** に、次の2つを登録してください（APIトークンは必ずSecretとして保管します）。

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`（Cloudflare PagesのEdit権限）

Cloudflare側にはPagesプロジェクト `it-strategy` が必要です。まだ作成していない場合は、Cloudflare Dashboardでプロジェクト名 `it-strategy` を作成し、本番ブランチを `main` に設定してからActionsを実行してください。デプロイ先は `https://it-strategy.pages.dev` です（同名プロジェクトを別アカウントですでに使用している場合、URLに別の一意名が付きます）。

公開後もPDFの初回取得にはネット接続が必要です。PDFは訪問者のブラウザ内キャッシュに保存されます。
