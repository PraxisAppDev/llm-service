# Afterhours LLM Service Monorepo

This monorepo contains all of the backend, frontend, and IaC code for the _Afterhours LLM Service_.

## About

The _Afterhours LLM Service_ provides API access to large language models (LLMs) for authorized
users via API keys. The API is meant to be used for [Praxis Engineering](https://praxiseng.com)
"Afterhours" projects that require access to LLMs that are too big to run on local development
machines.

## Setup

You'll need:

- An AWS account
- AWS credentials setup in a local profile
- Node.js 22.x

Clone the repo and run `npm install` in both the root and `ui` directories.

## Development

Start SST to deploy a development environment in AWS and run the UI locally:

```shell
$ AWS_PROFILE=<profile> npm run dev
```

Use the provided script to seed an admin user in your development environment:

```shell
$ AWS_PROFILE=<profile> npm run seed:admin "Name" "email address" password
```

To tear down your development environment in AWS:

```shell
$ AWS_PROFILE=<profile> npm run remove
```
