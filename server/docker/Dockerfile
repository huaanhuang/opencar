FROM registry.io/centos:7
WORKDIR /data/www/backend
COPY config ./config
COPY admin_api .
RUN ["chmod", "+x", "./admin_api"]
ENTRYPOINT ["./admin_api"]
CMD [""]