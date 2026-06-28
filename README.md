# Split-the-bill

A simple web application for splitting bills among members.

## Overview

Split-the-bill helps calculate how much each person should pay or receive when multiple people have paid different amounts in advance.

Users can enter each member's name, group, and paid amount, and the application automatically calculates the final balance and transfer amounts.

## Features

- Add and remove members
- Enter paid amounts for each member
- Set different cost-sharing weights by group
- Calculate each member's balance
- Generate transfer instructions

## Tech Stack

- Next.js
- React
- TypeScript

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open the following URL in your browser:

```bash
http://localhost:3000
```

## Project Structure

```bash
.
├── app
├── public
├── package.json
├── next.config.ts
└── tsconfig.json
```

## Future Improvements

- Save input data
- Improve mobile layout
- Add a copy function for transfer results
- Export calculation results

## 日本語概要

Split-the-billは、研究室やゼミでのイベント後に発生する立替精算を簡単に行うためのWebアプリケーションです。

メンバーごとの立替金額に加えて、学年やグループごとに異なる負担割合を設定でき、各メンバーの負担額や送金額を自動で計算します。

通常の均等割りだけでなく、参加者の属性に応じて負担額が変わるケースにも対応できるようにしています。
