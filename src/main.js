/**
 * Created on 1401/6/15 (2022/9/6).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */

import http from 'node:http'
import https from 'node:https'
import { pipeline as promisedPipeline } from 'node:stream/promises'
import { C, D, T } from 'anstyle'

const PORT = process.env.PORT ?? 8888
http.createServer(requestHandler).listen(PORT)
console.info(D, 'Listening on', T, PORT)

function requestHandler (req, res) {
  if (req.method === 'OPTIONS') {
    allowCors(req, res)
    return res.end()
  }
  
  console.info(C, D, '\nX-Forwarded-For:', T, req.headers['x-forwarded-for'])
  
  proxy(req, res).catch((err) => {
    console.error(err)
    res.end()
  })
}

const proxy = async (req, res) => await new Promise(async (resolve, reject) => {
  const endpoint = req.headers['x-forwarded-for'] + req.url
  let endUrl
  try {
    endUrl = new URL(endpoint)
  } catch (e) {
    console.error(e)
    res.statusCode = 400
    return res.end(`Bad URL format: ${endpoint}\n"X-Forwarded-For": ${req.headers['x-forwarded-for']}`)
  }
  
  const { 'x-forwarded-for': skip1, 'x-content-type': skip2, ...endHeaders } = { ...req.headers, host: endUrl.host }
  
  const endReq = (endUrl.protocol === 'https:' ? https : http)
    .request(endUrl, {
      method: req.method,
      headers: endHeaders,
    }, async (endRes) => {
      res.writeHead(endRes.statusCode, {
        ...endRes.headers,
        'X-Powered-By': 'ReverseProxy:Proxy',
      })
      for await (const data of endRes) {
        res.write(data)
      }
      res.end()
    })
  await promisedPipeline(req, endReq).catch(reject)
})

function allowCors (req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  const requestedMethods = req.headers['access-control-request-method']
  if (requestedMethods) res.setHeader('Access-Control-Allow-Method', requestedMethods)
  const requestedHeaders = req.headers['access-control-request-headers']
  if (requestedHeaders) res.setHeader('Access-Control-Allow-Headers', requestedHeaders)
}
